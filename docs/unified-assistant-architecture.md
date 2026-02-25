# Unified Assistant + Canvas Architecture

## Goals
- Single cohesive chat window with diagram/image/sketch assets in one place.
- Single orchestration model (`claude-sonnet-4`) for chat + diagram code generation.
- Async generation jobs for long-running outputs.
- Multi-chat history with independent backend APIs.
- Deterministic canvas output path (avoid LLM-authored Excalidraw JSON for sketches).

## Backend contract
- `GET /api/assistant/chats?clientId=...`
- `POST /api/assistant/chats`
- `GET /api/assistant/chats/:chatId/messages?clientId=...`
- `POST /api/assistant/chats/:chatId/messages`
- `GET /api/assistant/jobs/:jobId?clientId=...`

Deprecated routes:
- `POST /api/chat` (returns `410`)
- `POST /api/generate-image` (returns `410`)

Each message supports `generation.mode`:
- `chat`
- `mermaid`
- `d2`
- `image`
- `sketch`

Sketch controls are explicit:
- `style`: `clean | hand-drawn | technical | organic`
- `complexity`: `low | medium | high`
- `colorPalette`: target palette count
- `detailLevel`: 0..1
- `edgeSensitivity`: 0..30

## Processing model
- Chat + diagram code are handled synchronously when possible.
- Diagram/image/sketch requests create async jobs and are polled by the client.
- Job output is attached to assistant messages as typed artifacts:
  - `code` (`mermaid`/`d2`)
  - `image-data`
  - `canvas-elements`

## Sketch pipeline (better approach)
Use a 3-stage deterministic pipeline:
1. Raster generation model output (`image-data`).
2. Non-LLM vectorization (posterize/segment/trace/simplify) with style knobs.
3. Compile into Excalidraw elements (`rectangle`/`line`/`text`), then draw.

Current implementation includes a deterministic image-to-elements vectorizer on the client for `sketch` artifacts.

Recommended production variant:
- Move vectorization to an independent worker service (Rust/Python/OpenCV).
- Return stable vector payload + quality metrics:
  - element count
  - simplification ratio
  - edge confidence
  - palette entropy

## Frontend behavior
- One panel for threads + messages + generation controls.
- `Generate image` menu action opens chat directly in `image` mode.
- Sketch assets expose both:
  - `Add Image`
  - `Vectorize to Canvas`
- Mermaid/D2 artifacts expose:
  - source code preview
  - `Add to Canvas`

## Why this is less bloated
- Removes provider toggles and split chat/image UI flows.
- Treats all outputs as typed message artifacts.
- Keeps canvas insertion deterministic and explicit.
- Centralizes async state in job APIs instead of ad-hoc component state.
