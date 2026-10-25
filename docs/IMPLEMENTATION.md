# Implementation notes

## First implementation

- React/Vite frontend and Express/TypeScript API in npm workspaces.
- MongoDB stores anonymous rounds. Session access uses a signed HTTP-only cookie and a SHA-256 token hash in each round.
- Three original SVG targets with server-only attributes; target asset URL and alt text are the only pre-score target data returned.
- Explicit start records server timestamps; deadline is fixed at 60 seconds. Submissions arriving at/after deadline are rejected. An unsubmitted round expires and unsent text is not scored.
- Prompt-only scoring supports a deterministic local mock and server-side Gemini structured evaluation. Generated image support is disabled; no visual score is fabricated.
- Voice uses browser Web Speech API where available, with editable typed fallback.

## Follow-up before public launch

1. Extend Gemini input to include the actual target image bytes; current evaluator uses curated target attributes and alt text.
2. Add a durable scoring queue/recovery worker so a process restart cannot strand a saved prompt in `scoring`.
3. Configure image generation and approved object storage before enabling visual scoring.
4. Set a retention/deletion policy, production cookie/CORS/HTTPS settings, and deployment observability.
5. Complete E2E and accessibility/mobile QA against the product acceptance checklist.

## Known gap

Gemini scoring is implemented, but it currently evaluates against the curated target rubric and alt text; image-bytes input remains follow-up work.
