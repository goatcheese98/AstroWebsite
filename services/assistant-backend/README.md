# Assistant Backend (Independent Service)

This is a standalone backend service for chat orchestration and async worker jobs.

## Run

```bash
cd services/assistant-backend
bun run dev
```

Default URL: `http://localhost:8788`

Node fallback:

```bash
npm run dev:node
```

## Environment

- `ANTHROPIC_API_KEY` (required for Claude responses)
- `AI_BACKEND_API_KEY` (optional; required if Astro proxy sends bearer auth)
- `PORT` (optional, default `8788`)
- `CLAUDE_MODEL` (optional, default `claude-sonnet-4-20250514`)

## API

- `GET /v1/assistant/chats?clientId=...`
- `POST /v1/assistant/chats`
- `GET /v1/assistant/chats/:chatId/messages?clientId=...`
- `POST /v1/assistant/chats/:chatId/messages`
- `GET /v1/assistant/jobs/:jobId?clientId=...`

Identity headers expected from Astro:
- `x-assistant-client-id`
- `x-assistant-user-id`
- `x-assistant-user-email`

## Notes

- Chat mode is fully implemented with Claude.
- Diagram jobs (`mermaid`/`d2`) are async via internal worker queue.
- `image`/`sketch` are scaffolded and currently return a worker-not-configured failure until you plug in your image model + vectorization pipeline.
- Opening `http://localhost:8788` returns a health payload.
- Use `http://localhost:8788/v1/assistant/chats?clientId=dev-local` for direct API testing.
- Or send `x-assistant-client-id` header through the Astro proxy.
