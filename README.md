# Prompt Arena

A timed visual-description game built with React, Express, TypeScript, and MongoDB. The server owns the 60-second deadline, stores the frozen prompt, and computes the score. Browser speech recognition is an optional input method; typing is always available.

## Requirements

- Node.js 20 or newer
- MongoDB 7 or newer (local or hosted)
- npm 10+

## Run locally

1. Copy `.env.example` to `.env` and set `SESSION_SECRET` to a random value.
2. Start MongoDB and leave `AI_PROVIDER=mock` and `IMAGE_GENERATION_ENABLED=false` for a no-cost local run.
3. Run `npm install`, then `npm run dev`.
4. Open http://localhost:5173. API health is at http://localhost:4000/api/v1/health.

The mock evaluator runs without an AI key. Gemini evaluation can be enabled with `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL`; it returns structured attribute judgments that are validated and scored on the server. Image generation is intentionally off until a provider and asset storage adapter are configured; unavailable visual scoring never lowers the prompt score.

## Commands

`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run format:check`. Before the first E2E run, install its browser with `npx playwright install chromium`.

## Automatic GitHub sync

`npm run dev` also starts a Git watcher. It stages non-ignored project changes, creates an `Auto-sync` commit after five seconds without file changes, then pushes the current branch to `origin`. Run `npm run sync:github` to watch and sync without starting the app. Keep one of these commands running while editing. Git must have working credentials and `origin` must point to your repository. Failed pushes are retried with backoff; `.gitignore` files are excluded.

## Product notes

- A prepared round shows an approved project-created target; its hidden rubric remains server-side.
- The explicit **Start round** action starts the authoritative 60-second clock.
- Only a submission received before the deadline is accepted. At deadline, the client locks and the server expires an unsubmitted round; unsent text is not scored.
- The MVP ships with prompt-only scoring. The result labels it **Prompt Score**. Generated-image comparison remains disabled until a supported provider and approved storage are configured.
- Browser speech recognition support varies and may involve browser-vendor processing. Raw audio is not uploaded or stored by this app. Typed input always works.
- Prompts and results are retained in MongoDB for now. Set a retention policy before public launch.

## Security

Set a strong `SESSION_SECRET`; keep provider keys and MongoDB credentials server-side. Round access uses a random session token in a secure, HTTP-only cookie with its hash stored by the API. Configure `CLIENT_ORIGIN` to the exact frontend origin in production. Use HTTPS in production.

## Specification

The canonical product requirements are in [`spec.md`](./spec.md). See [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) for implemented scope and known decisions.
