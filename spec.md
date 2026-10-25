# Prompt Arena — Master Product & Engineering Specification (SSOT)

**Version:** 1.0.0  
**Last updated:** 2026-10-25  
**Purpose:** Single source of truth for Codex and all contributors  
**Stack:** MERN + TypeScript  
**AI:** Google Gemini for multimodal evaluation; a separate image-generation provider may be required  
**Round duration:** Exactly 60 seconds, enforced by the server

> **Authority rule:** This document is canonical. If code, prompts, UI copy, or other docs conflict with it, this document wins until explicitly amended. Codex must not silently change product requirements. Record proposed changes in the Decisions section.

## 1. Product vision

Prompt Arena is a gamified platform for testing how accurately a player can describe a displayed image under time pressure. A target image is shown for a 60-second round. The player describes it primarily by voice; speech is converted to editable text. The submitted prompt is scored against the target image. Optionally, the platform generates a new image from the player's prompt and compares that generated image with the target, adding a separate visual-similarity score.

The product must clearly distinguish:
1. **Prompt-to-target score:** How well the text describes the target.
2. **Generated-image-to-target score:** How visually similar the generated image is to the target.
3. **Final score:** A documented weighted combination, with a fallback if image generation is unavailable.

AI similarity scores are estimates, not objective truth. The product must not promise pixel-perfect reproduction.

## 2. Goals and scope

### MVP — must ship
- Landing page and Play CTA.
- Curated target image bank with alt text and appropriate usage rights.
- Server-created round and authoritative 60-second deadline.
- Voice-to-text input with visible editable transcript.
- Typed input fallback on every supported browser.
- Early submit and automatic lock at timeout.
- Server-side semantic evaluation of the final prompt against the target.
- Versioned score formula and component breakdown.
- Result screen with matched/missed details and feedback.
- Optional image generation through a provider adapter; compare generated image to target when enabled.
- MongoDB persistence, safe errors, rate limits, secret management, automated tests, and setup docs.

### Out of scope unless separately approved
- Multiplayer, tournaments, prizes, betting, payments, global leaderboards.
- Accounts and social features.
- Public image uploads/community image packs.
- Custom model training or a guarantee of exact image replication.
- Native mobile apps.

## 3. Core game loop

1. Player opens the site and selects **Play**.
2. Server prepares a round and chooses a target from an approved image bank.
3. Player explicitly starts the round; the server sets `startedAt` and `deadlineAt = startedAt + 60 seconds`.
4. Target image and countdown appear.
5. Player speaks; browser speech recognition converts speech to editable text. Player may correct the transcript or type instead.
6. Player submits early or the timer expires. The prompt is frozen.
7. Server rejects submissions received at or after the deadline.
8. Server persists the final prompt, then evaluates it against hidden target attributes.
9. If image generation is enabled, server generates an image from the frozen prompt and compares it with the target.
10. Server calculates and stores the score and scoring version.
11. Result screen shows the component scores, final score, matched/missed attributes, and generated image if available.

**Timer rule:** The browser countdown is display-only. Server timestamps determine whether a submission is on time. AI processing happens after the prompt is frozen and never consumes the player's 60 seconds.

## 4. User stories

- As a player, I can start a round and see a target image.
- I can see how much of the 60 seconds remains.
- I can speak and see the words transcribed into editable text.
- I can type if microphone permission is denied or speech recognition is unsupported.
- I can submit before time expires.
- I receive a score based on salient visual attributes, not keyword overlap alone.
- I can see what I described correctly and what I missed.
- I can compare the target with an AI-generated image from my prompt when that feature is enabled.
- I can understand whether my score is prompt-only or combined.
- I receive a safe recovery message if AI processing fails.

## 5. Routes

Use React Router.

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/play` | Active round |
| `/results/:roundId` | Completed result |
| `/how-to-play` | Rules, voice permissions, scoring explanation |
| `*` | Not found |

MVP may use anonymous sessions. Use opaque random access tokens; do not treat a MongoDB ObjectId as authorization. Store token hashes server-side where feasible and never put access tokens in URLs.

## 6. Functional requirements

Priority: **P0** required for MVP; **P1** post-MVP.

### 6.1 Target images and round creation
- **FR-001 (P0):** Start a round using a server-selected target image.
- **FR-002 (P0):** Target record includes stable ID, asset URL, alt text, category/tags, source/license metadata, and hidden evaluation attributes.
- **FR-003 (P0):** Use project-created, licensed, or otherwise approved images.
- **FR-004 (P0):** Never send hidden attributes, expected answers, or scoring weights to the browser before scoring.
- **FR-005 (P0):** The timer starts only after the player clicks Start and the server records `startedAt`.
- **FR-006 (P0):** Server sets deadline to exactly 60 seconds after start.
- **FR-007 (P0):** Avoid repeating the same image in immediate consecutive rounds for the same session when enough images exist.
- **FR-008 (P0):** Rate-limit round creation and make start/create requests idempotent.

### 6.2 Timer and submission
- **FR-020 (P0):** Each timed round is exactly 60 seconds, measured by server timestamps.
- **FR-021 (P0):** UI countdown derives from `deadlineAt` and server-time offset; do not decrement a local counter as the source of truth.
- **FR-022 (P0):** Player may submit early.
- **FR-023 (P0):** At timeout, lock the input and finalize the round.
- **FR-024 (P0):** Server rejects submissions received at or after deadline with `409 ROUND_EXPIRED`.
- **FR-025 (P0):** One final submission per round. Identical retries are idempotent; a different second submission is rejected.
- **FR-026 (P0):** Persist exact final text and submission time before starting long-running scoring.
- **FR-027 (P0):** A disconnected client cannot extend the round; server calculates expiry from stored timestamps.
- **FR-028 (P0):** AI latency must not extend the prompt-entry window.

### 6.3 Voice-to-text
- **FR-030 (P0):** Microphone states: idle, requesting permission, listening, transcript available, unsupported, denied, and error.
- **FR-031 (P0):** Show recognized text in an editable field.
- **FR-032 (P0):** Typed input is always available.
- **FR-033 (P0):** Feature-detect browser speech recognition; support varies by browser/OS.
- **FR-034 (P0):** If permission is denied, do not repeatedly prompt without user action.
- **FR-035 (P0):** Provide start/stop recording controls and visible microphone state.
- **FR-036 (P0):** Prefer browser speech recognition for MVP. Do not upload/store raw audio by default. Disclose that some browsers may process speech using a vendor service.
- **FR-037 (P0):** Handle interim and final recognition results without duplicating transcript text.
- **FR-038 (P0):** Freeze the transcript at deadline; speech recognition cannot bypass the timer.
- **FR-039 (P1):** Add language selection and server-based transcription fallback.

### 6.4 Prompt evaluation
- **FR-040 (P0):** Evaluate final text against the target image using a configured multimodal evaluator.
- **FR-041 (P0):** Assess salient attributes: main subjects, approximate object count, colors, setting, actions, spatial relationships, composition, and distinctive details.
- **FR-042 (P0):** Require structured evaluator output and validate it at runtime.
- **FR-043 (P0):** Return matched, partial, missed, and contradicted attributes, concise feedback, and a numeric score.
- **FR-044 (P0):** Do not reward verbosity or repeated keywords alone.
- **FR-045 (P0):** Do not expose hidden prompts, internal reasoning, target rubric, or secrets.
- **FR-046 (P0):** Store score/rubric version and model ID.
- **FR-047 (P0):** Server clamps scores to 0–100 and computes the final score.
- **FR-048 (P0):** If evaluation fails after bounded retries, retain the prompt and show retryable scoring state or safe failure; never invent a score.

### 6.5 Generated image comparison
- **FR-050:** When enabled, generate an image from the frozen prompt using a configured image-generation provider.
- **FR-051:** Do not assume Gemini text generation produces image files. Implement an `ImageGenerationProvider` adapter for a provider/model that explicitly supports image generation.
- **FR-052:** Store assets in approved object storage or a controlled asset service; do not store large base64 images in MongoDB.
- **FR-053:** Compare generated and target images with a documented evaluator: vision-model rubric, embeddings, or combination.
- **FR-054:** Evaluate subject, composition, colors, setting, object count, and salient attributes. Do not claim pixel-perfect identity.
- **FR-055:** Label target and generated images clearly and provide alt text.
- **FR-056:** If image generation fails, show prompt-only score with an explanation; do not silently treat missing visual score as zero.
- **FR-057:** Generated content follows provider safety policies and project safety rules.
- **FR-058:** Image generation happens after submission, outside the 60-second entry window.

## 7. Scoring model

Scores use a 0–100 scale and a versioned algorithm.

Let:
- `P` = prompt-to-target semantic score (0–100).
- `V` = generated-image-to-target visual score (0–100).
- `F` = final score (0–100).

When image generation succeeds:

`F = round(0.60 × P + 0.40 × V)`

When image generation is disabled or fails:

`F = P`

The result UI must state **Prompt Score** or **Combined Score**. Store component scores, `scoringVersion`, and whether visual scoring was available.

### Suggested prompt attribute weights

| Dimension | Default weight |
|---|---:|
| Main subject(s) and category | 30% |
| Objects and approximate count | 15% |
| Actions, pose, relationships | 15% |
| Setting/background | 15% |
| Dominant colors and lighting | 10% |
| Composition/spatial layout | 10% |
| Distinctive details/style | 5% |

Weights must total 100 and may be adjusted per target. Evaluator judgments: `matched`, `partial`, `missed`, `contradicted`. Backend maps judgments to scores:
- matched = 1.0 × weight
- partial = 0.5 × weight
- missed = 0 × weight
- contradicted = 0 × weight; optional contradiction penalty only if explicitly defined and capped in the scoring version.

Fairness rules:
- Accept synonyms and paraphrases.
- Do not require exact hidden reference wording.
- Do not reward verbosity.
- Test with human-written prompts at different levels of detail.
- State supported languages; scores may vary by model/version.

## 8. AI integration

### Gemini responsibilities
- Analyze target images and derive structured hidden attributes.
- Evaluate player prompts against target image and attributes.
- Produce concise feedback from validated scoring output.
- Optionally help compare generated image and target if the selected model supports it.

### Provider adapters
```ts
interface PromptEvaluator {
  evaluate(input: {
    targetImageUrl: string;
    targetAttributes: TargetAttribute[];
    playerPrompt: string;
    locale: string;
  }): Promise<PromptEvaluation>;
}

interface ImageGenerationProvider {
  generate(input: {
    prompt: string;
    requestId: string;
  }): Promise<{ assetUrl: string; providerModel: string }>;
}

interface VisualSimilarityEvaluator {
  compare(input: {
    targetImageUrl: string;
    generatedImageUrl: string;
  }): Promise<VisualEvaluation>;
}
```

Provide deterministic mock implementations for tests/local development. Automated tests must not spend real AI credits by default. Use the official supported Google Gen AI SDK for Node.js, pin a compatible version, and configure the model through `GEMINI_MODEL`. Keep `GEMINI_API_KEY` server-side. Request structured output where supported and validate with Zod. Treat prompts as untrusted data; they must not override system instructions or trigger tools.

## 9. Technical architecture

- **Frontend:** React + Vite + TypeScript.
- **Routing:** React Router.
- **Styling:** Tailwind CSS or CSS Modules; choose one.
- **Backend:** Node.js + Express + TypeScript.
- **Database:** MongoDB with Mongoose or official driver; choose one.
- **AI:** Gemini through server-side SDK.
- **Speech:** Browser Web Speech API when available; typed fallback always.
- **Image generation:** Adapter for a configured image-generation service.
- **Validation:** Zod.
- **Testing:** Vitest + React Testing Library; Vitest/Jest + Supertest; Playwright E2E.
- **Lint/format:** ESLint + Prettier.
- **Monorepo:** npm workspaces.
- Use TypeScript strict mode, a supported Node LTS version, and documented scripts.

### Suggested repository layout
```text
prompt-arena/
  apps/
    web/src/{app,components,features, routes,lib,styles}/
    api/src/{config,middleware,modules,providers,repositories,schemas}/
  packages/shared/src/{schemas,types,constants}/
  docs/SPEC.md
  docs/API.md
  docs/SCORING.md
  docs/ADR/
  .env.example
  .gitignore
  package.json
  README.md
```

## 10. Data model

### `targets`
```ts
{
  _id: ObjectId,
  targetId: string,
  assetUrl: string,
  thumbnailUrl?: string,
  altText: string,
  category: string,
  tags: string[],
  sourceType: "licensed" | "project_generated" | "approved_upload",
  sourceAttribution?: string,
  hiddenAttributes: Array<{
    id: string;
    description: string;
    weight: number;
    expectedVariants: string[];
  }>,
  difficulty: "easy" | "medium" | "hard",
  active: boolean,
  createdAt: Date,
  updatedAt: Date
}
```
Never send `hiddenAttributes` before scoring.

### `rounds`
```ts
{
  _id: ObjectId,
  roundId: string,
  sessionTokenHash: string,
  targetId: ObjectId,
  status: "prepared" | "active" | "submitted" | "scoring" | "completed" | "expired" | "failed",
  startedAt?: Date,
  deadlineAt?: Date,
  submittedAt?: Date,
  playerPrompt?: string,
  scoringVersion?: string,
  promptEvaluation?: {
    score: number;
    matchedAttributes: Array<{ attributeId: string; reason: string }>;
    partialAttributes: Array<{ attributeId: string; reason: string }>;
    missedAttributes: Array<{ attributeId: string; reason: string }>;
    contradictedAttributes: Array<{ attributeId: string; reason: string }>;
    feedback: string;
  },
  generatedImage?: { assetUrl: string; providerModel: string; createdAt: Date },
  visualEvaluation?: { score: number; feedback: string; evaluatorVersion: string },
  finalScore?: number,
  scoreMode?: "prompt_only" | "combined",
  failureCode?: string,
  createdAt: Date,
  updatedAt: Date
}
```
Separate evaluation data if retention/access control/document size requires it. Never return a raw MongoDB document to the client.

## 11. API contract

Base path `/api/v1`; JSON. Standard error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the input.",
    "requestId": "req_..."
  }
}
```

### `GET /api/v1/health`
Return safe service and database status. Never expose secrets.

### `POST /api/v1/rounds`
Prepare a round and return a target that is safe to show, but not its hidden attributes:
```json
{
  "roundId": "round_public_id",
  "status": "prepared",
  "target": {
    "imageUrl": "https://approved-cdn.example/target.jpg",
    "altText": "A red bicycle beside a brick wall"
  }
}
```
Example URL is illustrative only.

### `POST /api/v1/rounds/:roundId/start`
Starts the timer on the server and returns:
```json
{
  "roundId": "round_public_id",
  "status": "active",
  "startedAt": "2026-10-25T09:00:00.000Z",
  "deadlineAt": "2026-10-25T09:01:00.000Z",
  "serverNow": "2026-10-25T09:00:00.000Z"
}
```
The server enforces exactly 60 seconds; client cannot set duration.

### `POST /api/v1/rounds/:roundId/submit`
Request:
```json
{ "prompt": "A red bicycle leaning against a brick wall on a sunny street." }
```
Return `202 Accepted` after prompt persistence:
```json
{
  "roundId": "round_public_id",
  "status": "scoring",
  "submittedAt": "2026-10-25T09:00:45.000Z",
  "resultUrl": "/api/v1/rounds/round_public_id/result"
}
```
Prompt limit: 2,000 characters. Reject empty and late submissions. Duplicate requests must not trigger duplicate provider charges.

### `GET /api/v1/rounds/:roundId/status`
Returns status and deadline only; no hidden rubric.

### `GET /api/v1/rounds/:roundId/result`
Returns target, final prompt, prompt score, generated image and visual score if available, final score, score mode, attribute feedback, and scoring version. Return a clear pending status until complete.

### Optional `POST /api/v1/rounds/:roundId/score-retry`
Retry only failed jobs with rate limits and bounded retries; may be omitted from MVP.

API security:
- Validate parameters and bodies with Zod.
- Check session/round access on every round-specific endpoint.
- Never trust client-provided score, target ID, deadline, generated image URL, or score mode.
- Use request IDs, strict CORS, Helmet, request-size limits, and rate limiting.
- Allowlist media hosts; prevent SSRF and unsafe URL fetching.
- Use conditional updates/transactions to protect submission races.

## 12. Frontend UX

### Visual direction
A polished creative challenge/game-show feel. The image is the main focus. Use a prominent countdown, clear microphone state, editable transcript, and an obvious submit action. Keep the page uncluttered. Use readable contrast, restrained gradients, responsive layouts, and reduced-motion support.

### Required screens
- **Landing:** Product description, Play CTA, 60-second and voice/text explanation, scoring overview.
- **Active round:** Target image, accessible countdown, microphone states, editable transcript, typed fallback, character count, submit button.
- **Scoring state:** Honest server-driven status for evaluation and optional image generation. Explain that the prompt is locked.
- **Results:** Prompt score, visual score if available, final score and mode, target/generated images clearly labeled, matched/partial/missed/contradicted attributes, concise improvement feedback, Play Again.
- **Global states:** Loading, denied microphone, unsupported speech API, empty prompt, expired round, pending scoring, provider failure, invalid round, not found.

Do not fabricate progress percentages. Every button must work or be visibly disabled with a reason.

## 13. Accessibility and privacy

- Target WCAG 2.2 AA.
- Keyboard-accessible controls and visible focus.
- Announce meaningful timer milestones to screen readers, not every second.
- Never communicate time only by color.
- Alt text for target/generated images.
- Typed input always available.
- Explain microphone permission before requesting it.
- Do not store raw audio by default.
- Disclose possible browser/vendor speech processing.
- Publish privacy and retention policy for prompts, images, and results.
- Do not use user prompts/audio for model training unless explicitly approved and disclosed.

## 14. Security and abuse prevention

- Keep Gemini, image provider, MongoDB and session secrets server-side.
- Commit `.env.example`, never `.env`.
- Validate and limit prompt size; rate-limit rounds, submissions and retries.
- Use opaque random access tokens and store hashes.
- Safe text rendering; avoid unsanitized HTML.
- Apply provider safety policies to generated images.
- Fetch media only from approved hosts.
- Treat player prompt as untrusted content; it cannot override system rules or trigger tools.
- Use timeouts and bounded retries.
- Never log session tokens or raw audio.
- Clearly label generated images as AI-generated; do not imply exact replication.

## 15. Error codes and observability

Suggested codes:
`VALIDATION_ERROR`, `ROUND_NOT_FOUND`, `ROUND_ACCESS_DENIED`, `ROUND_EXPIRED`, `ROUND_ALREADY_SUBMITTED`, `PROMPT_EMPTY`, `AI_PROVIDER_UNAVAILABLE`, `EVALUATION_FAILED`, `IMAGE_GENERATION_FAILED`, `VISUAL_COMPARISON_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

Log structured events with request ID, route, duration, safe error code, scoring version, and provider duration. Avoid raw audio, session tokens, and unnecessary personal data. Track round starts, submissions, speech failure rate (aggregate), scoring latency, provider errors, image-generation errors, and costs where available.

## 16. Testing strategy

### Unit tests
- Deadline exactly 60 seconds after server start.
- Clock offset and countdown calculation.
- Late submission rejection; early submission acceptance.
- Prompt freeze and idempotent duplicate submission.
- Score formula and prompt-only fallback.
- Attribute weights total 100; scores clamp to 0–100.
- AI schema validation and public DTO hiding attributes.
- Interim/final speech results do not duplicate transcript.
- Provider timeout and retry behavior.

### API integration tests
- Create/prepare round, start timer, submit prompt.
- Reject empty and late prompts.
- Deny unauthorized access.
- Prevent duplicate charges on repeated submissions.
- Return pending/completed/failed scoring states.
- Verify score formula.
- Image-generation failure returns prompt-only mode.
- Client cannot override score, deadline, target, or score mode.

### Frontend and E2E
- Countdown uses server deadline.
- Microphone permission and unsupported-browser paths.
- Transcript editing and typed fallback.
- Timeout locks input.
- Results label prompt-only vs combined score correctly.
- Use mocked providers and a controllable test clock; do not wait 60 real seconds in every test.
- Verify hidden target attributes never appear in pre-score network responses.
- Test keyboard navigation and mobile layout.

## 17. Non-functional requirements

- Fast round creation; AI scoring after submission.
- Persist submission before long-running AI evaluation.
- Server-authoritative timer and scoring.
- Bounded AI/image costs, retries and prompt size.
- TypeScript strict mode, shared schemas, provider adapters, versioned scoring.
- Local development without paid API keys via mock providers.
- Voice and typed paths are both usable.
- Same stored evaluator output and scoring version produce the same final score.
- No fake functionality.

## 18. Environment variables

Create `.env.example`:
```dotenv
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/prompt_arena
GEMINI_API_KEY=
GEMINI_MODEL=
IMAGE_PROVIDER=
IMAGE_PROVIDER_API_KEY=
IMAGE_GENERATION_ENABLED=false
SESSION_SECRET=
ROUND_DURATION_SECONDS=60
ROUND_RATE_LIMIT_WINDOW_MS=3600000
ROUND_RATE_LIMIT_MAX=10
PROMPT_MAX_LENGTH=2000
AI_REQUEST_TIMEOUT_MS=60000
SCORING_VERSION=v1
LOG_LEVEL=info
```
Validate required variables at startup. Timed MVP mode must enforce 60 seconds; clients cannot change it. Never expose secrets via `VITE_` variables.

## 19. Local scripts

Provide working root scripts:
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run format:check`

Mock Gemini, image-generation, and visual-comparison providers must work locally. Real paid providers require explicit configuration.

## 20. Definition of Done

A feature is complete only when requirements are met, schemas/types updated, normal and error paths tested, hidden attributes and secrets protected, loading/success/failure states implemented, typed fallback available, timer server-authoritative, score formula versioned, accessibility/responsiveness checked, lint/typecheck/tests/build pass, and docs updated. Codex must report actual commands and outcomes.

## 21. Codex operating instructions

Before coding:
1. Inspect the repository and read `docs/SPEC.md`.
2. Produce a phased implementation plan and checklist.
3. Identify conflicts and missing prerequisites.
4. Do not assume keys, deployment targets, image provider, or storage are configured.
5. Ask before making product-level changes.

While coding:
- Implement small, testable vertical slices.
- Build with mock providers first.
- Keep timer enforcement and scoring on the server.
- Hide target attributes until results are ready.
- Use provider adapters and shared schemas.
- Add tests alongside each feature.
- Do not claim tests passed unless actually run.
- Do not replace production logic with hard-coded mocks.
- Update the spec and record decisions when requirements change.

### Recommended phases
**Phase 0 — Foundation:** Monorepo, TypeScript, lint, shared schemas, env validation, MongoDB, health endpoint.  
**Phase 1 — Core loop:** Target image, prepare/start round, server timer, typed input, submission, mock scoring, result.  
**Phase 2 — Voice:** Feature detection, transcript editing, permissions/errors, typed fallback, accessibility.  
**Phase 3 — Gemini scoring:** Hidden rubric, structured evaluator, deterministic scoring, feedback, tests.  
**Phase 4 — Image generation:** Provider adapter, storage, visual comparison, combined score, fallback.  
**Phase 5 — Release hardening:** Security, rate limits, observability, responsive/accessibility QA, deployment docs.

At each milestone Codex reports implemented features, changed files, actual test results, gaps, required environment variables, and next step.

## 22. MVP acceptance checklist

- [ ] Player starts a round and sees target image.
- [ ] Server deadline is exactly 60 seconds after explicit start.
- [ ] Countdown follows server deadline.
- [ ] Voice-to-text works where supported; typed input always works.
- [ ] Prompt freezes on submit or timeout.
- [ ] Server rejects late submissions.
- [ ] Prompt persists before AI evaluation.
- [ ] Gemini returns validated structured attribute judgments.
- [ ] Prompt score follows a versioned rubric.
- [ ] Optional image generation/comparison works through configured adapters.
- [ ] Image-provider failure uses prompt-only fallback.
- [ ] Result explains matched/missed attributes.
- [ ] Hidden rubric never leaks before scoring.
- [ ] Rate limits, access checks, safe errors and secret handling are implemented.
- [ ] Tests use mocks and no paid API calls.
- [ ] Lint, typecheck and production build pass.
- [ ] README documents setup, privacy, speech support, scoring and limitations.

## 23. Decisions to finalize before public launch

1. Which image-generation provider/model and per-round budget?
2. Ship prompt-only scoring first, or enable image generation on day one? **Recommendation:** ship prompt-only first, then enable visual scoring behind a feature flag.
3. Which languages? **Recommendation:** English for MVP, clearly disclosed.
4. Target image source: project-created, licensed, or curated mixture?
5. Are accounts, leaderboards and persistent history required?
6. What is the retention period for prompts, generated images and results?
7. Timer start: recommended explicit Start button, with the server setting `startedAt` only after that click.

## 24. Final implementation rule

**Build the smallest complete loop first: target image → 60-second prompt entry → voice/text transcription → server-side prompt evaluation → score and feedback.** Add generated-image comparison as a separately tested component. Never let AI latency consume the player's 60 seconds, never let the browser determine the official deadline or score, and always state whether the result is prompt-only or combined.
