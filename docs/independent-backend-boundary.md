# Independent Backend Boundary (Claude + Worker)

## Objective
Separate frontend from AI orchestration so Astro remains a thin API boundary, while an independent backend owns:
- Claude orchestration
- async job lifecycle
- worker queue execution for image/sketch rendering + vectorization

## Frontend-facing API (Astro)
Astro keeps a stable local contract:
- `GET /api/assistant/chats?clientId=...`
- `POST /api/assistant/chats`
- `GET /api/assistant/chats/:chatId/messages?clientId=...`
- `POST /api/assistant/chats/:chatId/messages`
- `GET /api/assistant/jobs/:jobId?clientId=...`

## Backend routing behavior
Astro route behavior is now:
1. If `AI_BACKEND_BASE_URL` is set: proxy to independent backend (`/v1/assistant/*`).
2. If not set: use local Claude-only fallback runtime.

This is implemented in:
- `src/lib/assistant/backend-boundary.ts`

## Required env vars
- `ANTHROPIC_API_KEY`: local Claude fallback runtime
- `AI_BACKEND_BASE_URL`: independent backend base URL (preferred)
- `AI_BACKEND_API_KEY`: optional backend auth token for proxy requests

## Expected independent backend endpoints
- `GET /v1/assistant/chats`
- `POST /v1/assistant/chats`
- `GET /v1/assistant/chats/:chatId/messages`
- `POST /v1/assistant/chats/:chatId/messages`
- `GET /v1/assistant/jobs/:jobId`

A runnable scaffold is included in:
- `services/assistant-backend`

Headers forwarded by Astro:
- `x-assistant-client-id`
- `x-assistant-user-id` (if signed in)
- `x-assistant-user-email` (if available)
- `Authorization: Bearer <AI_BACKEND_API_KEY>` (if configured)

## Worker scaffold contract
See `src/lib/assistant/worker-contract.ts`.

The backend should:
1. Create a job on generation request.
2. Enqueue worker task (`image` / `sketch` / `diagram-render`).
3. Update job status (`queued` -> `running` -> `completed|failed`).
4. Attach artifacts back to assistant message.

## Current local fallback limits
Local fallback supports Claude text/diagram orchestration and persists chats/messages/jobs in `CANVAS_KV`.
Image/sketch generation intentionally fails with a clear message to use the independent worker backend.
