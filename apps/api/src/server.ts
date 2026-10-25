import { randomBytes, createHash } from "node:crypto";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import { z } from "zod";
import { config } from "./config.js";
import { Round } from "./models.js";
import { targets } from "./targets.js";
import { evaluatePrompt } from "./providers.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) => {
  if (req.header("origin") === config.CLIENT_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", config.CLIENT_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Idempotency-Key,X-Request-Id",
    );
    return res.sendStatus(204);
  }
  return next();
});
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "X-Request-Id",
    req.header("x-request-id")?.slice(0, 80) ||
      `req_${randomBytes(8).toString("hex")}`,
  );
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser(config.SESSION_SECRET));

const createLimiter = rateLimit({
  windowMs: config.ROUND_RATE_LIMIT_WINDOW_MS,
  limit: config.ROUND_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    errorResponse(
      res,
      429,
      "RATE_LIMITED",
      "You've reached the hourly round limit. Please try again later.",
    ),
});
const submitLimiter = rateLimit({
  windowMs: config.ROUND_RATE_LIMIT_WINDOW_MS,
  limit: Math.max(config.ROUND_RATE_LIMIT_MAX * 2, 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    errorResponse(
      res,
      429,
      "RATE_LIMITED",
      "Please wait before submitting again.",
    ),
});
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const getToken = (req: Request) =>
  req.signedCookies?.arena_session as string | undefined;
const safeTarget = (id: string) => {
  const t = targets.find((item) => item.targetId === id);
  return t ? { imageUrl: t.assetUrl, altText: t.altText } : undefined;
};
const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
const errorResponse = (
  res: Response,
  status: number,
  code: string,
  message: string,
) =>
  res.status(status).json({
    error: { code, message, requestId: res.getHeader("X-Request-Id") },
  });

app.get(
  "/api/v1/health",
  asyncRoute(async (_req, res) =>
    res.json({
      status: "ok",
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    }),
  ),
);

app.post(
  "/api/v1/rounds",
  createLimiter,
  asyncRoute(async (req, res) => {
    const idempotencyKey = req.header("idempotency-key");
    if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,100}$/.test(idempotencyKey))
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "A valid Idempotency-Key header is required.",
      );
    const token = getToken(req) || randomBytes(32).toString("base64url");
    res.cookie("arena_session", token, {
      signed: true,
      httpOnly: true,
      sameSite: "strict",
      secure: config.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    const hash = tokenHash(token);
    const priorRequest = await Round.findOne({
      sessionTokenHash: hash,
      idempotencyKey,
    });
    if (priorRequest)
      return res.status(200).json({
        roundId: priorRequest.roundId,
        status: priorRequest.status,
        target: safeTarget(priorRequest.targetId),
      });
    const previous = (await Round.findOne({ sessionTokenHash: hash })
      .sort({ createdAt: -1 })
      .select("targetId")
      .lean()) as { targetId: string } | null;
    const available = targets.filter((t) => t.targetId !== previous?.targetId);
    const target = (available.length ? available : targets)[
      Math.floor(Math.random() * (available.length || targets.length))
    ]!;
    const roundId = `r_${randomBytes(18).toString("base64url")}`;
    try {
      await Round.create({
        roundId,
        sessionTokenHash: hash,
        idempotencyKey,
        targetId: target.targetId,
        status: "prepared",
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const existing = await Round.findOne({
        sessionTokenHash: hash,
        idempotencyKey,
      });
      if (existing)
        return res.status(200).json({
          roundId: existing.roundId,
          status: existing.status,
          target: safeTarget(existing.targetId),
        });
      throw error;
    }
    return res.status(201).json({
      roundId,
      status: "prepared",
      target: safeTarget(target.targetId),
    });
  }),
);

async function authorizedRound(req: Request, res: Response) {
  const token = getToken(req);
  if (!token) {
    errorResponse(
      res,
      401,
      "ROUND_ACCESS_DENIED",
      "Round access could not be verified.",
    );
    return null;
  }
  const round = await Round.findOne({
    roundId: req.params.roundId,
    sessionTokenHash: tokenHash(token),
  });
  if (!round) {
    errorResponse(
      res,
      404,
      "ROUND_NOT_FOUND",
      "This round could not be found.",
    );
    return null;
  }
  return round;
}

app.post(
  "/api/v1/rounds/:roundId/start",
  asyncRoute(async (req, res) => {
    const round = await authorizedRound(req, res);
    if (!round) return;
    if (round.status === "active" && round.startedAt && round.deadlineAt)
      return res.json({
        roundId: round.roundId,
        status: "active",
        startedAt: round.startedAt.toISOString(),
        deadlineAt: round.deadlineAt.toISOString(),
        serverNow: new Date().toISOString(),
      });
    if (round.status !== "prepared")
      return errorResponse(
        res,
        409,
        "ROUND_ALREADY_SUBMITTED",
        "This round can no longer be started.",
      );
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + 60_000);
    const startedRound = await Round.findOneAndUpdate(
      { _id: round._id, status: "prepared" },
      { $set: { startedAt: now, deadlineAt, status: "active" } },
      { new: true },
    );
    if (!startedRound) {
      const latest = await Round.findById(round._id);
      if (latest?.status === "active" && latest.startedAt && latest.deadlineAt)
        return res.json({
          roundId: latest.roundId,
          status: "active",
          startedAt: latest.startedAt.toISOString(),
          deadlineAt: latest.deadlineAt.toISOString(),
          serverNow: new Date().toISOString(),
        });
      return errorResponse(
        res,
        409,
        "ROUND_ALREADY_SUBMITTED",
        "This round can no longer be started.",
      );
    }
    return res.json({
      roundId: startedRound.roundId,
      status: "active",
      startedAt: now.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      serverNow: now.toISOString(),
    });
  }),
);

app.post(
  "/api/v1/rounds/:roundId/submit",
  submitLimiter,
  asyncRoute(async (req, res) => {
    const parsed = z
      .object({ prompt: z.string().max(config.PROMPT_MAX_LENGTH) })
      .safeParse(req.body);
    if (!parsed.success || !parsed.data.prompt.trim())
      return errorResponse(
        res,
        400,
        parsed.success ? "PROMPT_EMPTY" : "VALIDATION_ERROR",
        parsed.success
          ? "Please add a description before submitting."
          : "Please correct the input.",
      );
    const round = await authorizedRound(req, res);
    if (!round) return;
    if (
      round.playerPrompt !== undefined &&
      round.playerPrompt === parsed.data.prompt
    )
      return res.status(202).json({
        roundId: round.roundId,
        status: round.status,
        submittedAt: round.submittedAt?.toISOString(),
        resultUrl: `/api/v1/rounds/${round.roundId}/result`,
      });
    const now = new Date();
    const accepted = await Round.findOneAndUpdate(
      {
        _id: round._id,
        status: "active",
        deadlineAt: { $gt: now },
        playerPrompt: { $exists: false },
      },
      {
        $set: {
          playerPrompt: parsed.data.prompt,
          submittedAt: now,
          status: "scoring",
          scoringVersion: config.SCORING_VERSION,
        },
      },
      { new: true },
    );
    if (!accepted) {
      const latest = await Round.findById(round._id);
      if (latest?.playerPrompt === parsed.data.prompt)
        return res.status(202).json({
          roundId: round.roundId,
          status: latest.status,
          submittedAt: latest.submittedAt?.toISOString(),
          resultUrl: `/api/v1/rounds/${round.roundId}/result`,
        });
      if (
        !latest ||
        latest.status === "expired" ||
        !latest.deadlineAt ||
        now >= latest.deadlineAt
      ) {
        if (latest && latest.status === "active") {
          latest.status = "expired";
          await latest.save();
        }
        return errorResponse(
          res,
          409,
          "ROUND_EXPIRED",
          "The 60-second round has ended.",
        );
      }
      return errorResponse(
        res,
        409,
        "ROUND_ALREADY_SUBMITTED",
        "This round already has a final submission.",
      );
    }
    void scoreRound(accepted.roundId).catch(async (error: unknown) => {
      console.error("Scoring job failed", {
        roundId: accepted.roundId,
        error: error instanceof Error ? error.message : "unknown",
      });
      await Round.updateOne(
        { roundId: accepted.roundId, status: "scoring" },
        { $set: { status: "failed", failureCode: "EVALUATION_FAILED" } },
      );
    });
    return res.status(202).json({
      roundId: accepted.roundId,
      status: "scoring",
      submittedAt: now.toISOString(),
      resultUrl: `/api/v1/rounds/${accepted.roundId}/result`,
    });
  }),
);

async function scoreRound(roundId: string) {
  const round = await Round.findOne({ roundId, status: "scoring" });
  if (!round || !round.playerPrompt) return;
  const target = targets.find((t) => t.targetId === round.targetId);
  if (!target) throw new Error("Target missing");
  const evaluation = await evaluatePrompt(target, round.playerPrompt);
  round.promptEvaluation = evaluation;
  round.finalScore = evaluation.score;
  round.scoreMode = "prompt_only";
  round.status = "completed";
  await round.save();
}

app.get(
  "/api/v1/rounds/:roundId/status",
  asyncRoute(async (req, res) => {
    const round = await authorizedRound(req, res);
    if (!round) return;
    if (
      round.status === "active" &&
      round.deadlineAt &&
      Date.now() >= round.deadlineAt.getTime()
    ) {
      round.status = "expired";
      await round.save();
    }
    return res.json({
      roundId: round.roundId,
      status: round.status,
      deadlineAt: round.deadlineAt?.toISOString(),
    });
  }),
);

app.get(
  "/api/v1/rounds/:roundId/result",
  asyncRoute(async (req, res) => {
    const round = await authorizedRound(req, res);
    if (!round) return;
    if (
      round.status === "active" &&
      round.deadlineAt &&
      Date.now() >= round.deadlineAt.getTime()
    ) {
      round.status = "expired";
      await round.save();
    }
    const target = safeTarget(round.targetId);
    if (round.status !== "completed")
      return res.json({
        roundId: round.roundId,
        status: round.status,
        target,
        message:
          round.status === "scoring"
            ? "Your prompt is locked while we score it."
            : undefined,
      });
    const targetMeta = targets.find(
      (item) => item.targetId === round.targetId,
    )!;
    const evaluation = round.promptEvaluation as {
      score: number;
      attributes: Array<{
        attributeId: string;
        judgment: string;
        reason: string;
      }>;
      feedback: string;
    };
    const byId = new Map(
      evaluation.attributes.map((item) => [item.attributeId, item]),
    );
    const attributes = targetMeta.hiddenAttributes.map((item) => ({
      attributeId: item.id,
      label: item.description,
      judgment: byId.get(item.id)?.judgment ?? "missed",
      reason: byId.get(item.id)?.reason ?? "This detail was not clear.",
    }));
    return res.json({
      roundId: round.roundId,
      status: "completed",
      target,
      referencePrompt: targetMeta.referencePrompt,
      prompt: round.playerPrompt,
      promptScore: evaluation.score,
      visualScore: null,
      finalScore: round.finalScore,
      scoreMode: round.scoreMode,
      attributes,
      feedback: evaluation.feedback,
      scoringVersion: round.scoringVersion,
      modelId: (round.promptEvaluation as { modelId?: string }).modelId,
    });
  }),
);

app.use((_req, res) =>
  errorResponse(res, 404, "NOT_FOUND", "The requested resource was not found."),
);
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "unknown",
  );
  return errorResponse(
    res,
    500,
    "INTERNAL_ERROR",
    "Something went wrong. Please try again.",
  );
});

const server = app.listen(config.PORT, async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.info(`Prompt Arena API listening on ${config.PORT}`);
  } catch (error) {
    console.error("MongoDB connection failed", error);
    server.close(() => process.exit(1));
  }
});

export { app };
