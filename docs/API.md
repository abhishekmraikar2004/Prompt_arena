# API contract

All routes use JSON under `/api/v1`. Error bodies include `code`, a safe user-facing `message`, and `requestId`. The API sets an opaque signed, HTTP-only `arena_session` cookie and stores only its SHA-256 hash on rounds. Clients must send credentials and must never put session tokens in URLs.

## Routes

| Method and path                | Behavior                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                  | Safe API and MongoDB connectivity status.                                                                                    |
| `POST /rounds`                 | Requires an `Idempotency-Key` header; prepares a server-selected approved target and returns only its URL and alt text.      |
| `POST /rounds/:roundId/start`  | Starts once, returning `startedAt`, `deadlineAt`, and `serverNow`. Repeating start returns the existing active deadline.     |
| `POST /rounds/:roundId/submit` | Accepts `{ "prompt": "..." }` up to 2,000 characters. Saves prompt and time before asynchronous scoring, then returns `202`. |
| `GET /rounds/:roundId/status`  | Returns round status and deadline, never the hidden rubric.                                                                  |
| `GET /rounds/:roundId/result`  | Returns a safe pending state or completed result and attribute feedback.                                                     |

Only a request received strictly before `deadlineAt` can submit. An identical retry is idempotent; a different second prompt is rejected. At timeout the browser locks its input and the server marks the round expired when the client next requests status/result or submits. Unsubmitted text is not scored.

## Operational notes

- Every round-specific request checks the session cookie hash.
- The create and submit requests are size limited and rate limited. Start/create and submission races are protected by idempotency or conditional writes.
- The API uses exact-origin credentialed CORS, Helmet, Zod validation, and safe error messages.
- Configure `CLIENT_ORIGIN`, MongoDB, and a strong `SESSION_SECRET` for deployment. Use HTTPS in production.
