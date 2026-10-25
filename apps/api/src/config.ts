import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://127.0.0.1:27017/prompt_arena"),
  SESSION_SECRET: z
    .string()
    .min(24)
    .default("local-development-secret-change-me"),
  ROUND_DURATION_SECONDS: z.coerce
    .number()
    .int()
    .refine((n) => n === 60, "MVP duration must be 60 seconds")
    .default(60),
  ROUND_RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(3600000),
  ROUND_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  PROMPT_MAX_LENGTH: z.coerce.number().int().positive().max(2000).default(2000),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(60000),
  SCORING_VERSION: z.string().default("v1"),
  AI_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  IMAGE_GENERATION_ENABLED: z.string().default("false"),
});

export const config = envSchema.parse(process.env);
if (
  config.NODE_ENV === "production" &&
  config.SESSION_SECRET === "local-development-secret-change-me"
)
  throw new Error(
    "SESSION_SECRET must be set to a private random value in production",
  );
if (config.AI_PROVIDER === "gemini" && !config.GEMINI_API_KEY)
  throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
