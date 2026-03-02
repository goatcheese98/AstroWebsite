import type { APIRoute } from "astro";
import type {
  AssistantExpert,
  AssistantMode,
  AssistantSendMessageInput,
  VisualColorMode,
  SketchComplexity,
  SketchStyle,
} from "@/lib/assistant/types";
import { createAssistantGateway } from "@/lib/assistant/backend-boundary";
import {
  resolveAssistantOwnerId,
  resolveAnthropicApiKey,
  resolveAssistantBackendConfig,
} from "@/lib/assistant/auth";
import {
  hydrateOwnerState,
  exportOwnerState,
  type OwnerRuntimeSnapshot,
} from "@/lib/assistant/runtime-store";
import {
  prepareChatStreamSession,
  type ChatStreamSession,
} from "@/lib/assistant/service";
import { streamTextWithClaude } from "@/lib/assistant/claude";

export const prerender = false;

function errorStatus(error: unknown, fallback: number): number {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number" && status >= 400 && status <= 599) {
    return status;
  }
  return fallback;
}

function toMode(value: unknown): AssistantMode {
  if (value === "sketch") {
    return "image";
  }

  if (
    value === "mermaid" ||
    value === "d2" ||
    value === "image"
  ) {
    return value;
  }
  return "chat";
}

function toExpert(value: unknown, fallbackMode: AssistantMode): AssistantExpert {
  if (
    value === "general" ||
    value === "mermaid" ||
    value === "d2" ||
    value === "visual"
  ) {
    return value;
  }

  if (fallbackMode === "mermaid") return "mermaid";
  if (fallbackMode === "d2") return "d2";
  if (fallbackMode === "image" || fallbackMode === "sketch") return "visual";
  return "general";
}

function modeFromExpert(expert: AssistantExpert): AssistantMode {
  switch (expert) {
    case "mermaid":
      return "mermaid";
    case "d2":
      return "d2";
    case "visual":
      return "image";
    default:
      return "chat";
  }
}

function toColorMode(value: unknown): VisualColorMode {
  return value === "bw" ? "bw" : "color";
}

function toStyle(value: unknown): SketchStyle {
  if (value === "hand-drawn" || value === "technical" || value === "organic") {
    return value;
  }
  return "clean";
}

function toComplexity(value: unknown): SketchComplexity {
  if (value === "low" || value === "high") {
    return value;
  }
  return "medium";
}

export const GET: APIRoute = async (context) => {
  try {
    const chatId = context.params.chatId;
    if (!chatId) {
      return new Response(JSON.stringify({ error: "chatId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(context.request.url);
    const clientId = url.searchParams.get("clientId") || undefined;

    const gateway = createAssistantGateway(context);
    const messages = await gateway.listMessages({ clientId, chatId });

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to list messages",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: errorStatus(error, 400), headers: { "Content-Type": "application/json" } },
    );
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const chatId = context.params.chatId;
    if (!chatId) {
      return new Response(JSON.stringify({ error: "chatId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await context.request.clone().text();
    let body: any = null;
    if (rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = null;
      }
    } else {
      body = {};
    }

    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const requestPayload =
      body.payload && typeof body.payload === "object" ? body.payload : body;

    const clientId =
      typeof requestPayload.clientId === "string" ? requestPayload.clientId : undefined;
    const text = typeof requestPayload.text === "string" ? requestPayload.text : "";
    const legacyMode = toMode(requestPayload.generation?.mode);
    const expert = toExpert(requestPayload.generation?.expert, legacyMode);
    const mode = modeFromExpert(expert);

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Message text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: AssistantSendMessageInput = {
      text,
      generation: {
        expert,
        mode,
        sourceImageDataUrl:
          typeof requestPayload.generation?.sourceImageDataUrl === "string"
            ? requestPayload.generation.sourceImageDataUrl
            : undefined,
        visual: {
          colorMode: toColorMode(requestPayload.generation?.visual?.colorMode),
        },
        ...(requestPayload.generation?.sketch
          ? {
              sketch: {
                style: toStyle(requestPayload.generation?.sketch?.style),
                complexity: toComplexity(requestPayload.generation?.sketch?.complexity),
                colorPalette: Number.isFinite(requestPayload.generation?.sketch?.colorPalette)
                  ? Number(requestPayload.generation.sketch.colorPalette)
                  : 16,
                detailLevel: Number.isFinite(requestPayload.generation?.sketch?.detailLevel)
                  ? Number(requestPayload.generation.sketch.detailLevel)
                  : 0.7,
                edgeSensitivity: Number.isFinite(requestPayload.generation?.sketch?.edgeSensitivity)
                  ? Number(requestPayload.generation.sketch.edgeSensitivity)
                  : 18,
              },
            }
          : {}),
      },
    };

    // Streaming path for general expert on local backend
    const url = new URL(context.request.url);
    if (url.searchParams.get("stream") === "true" && expert === "general") {
      const backendConfig = resolveAssistantBackendConfig(context);
      if (!backendConfig.baseUrl) {
        const anthropicApiKey = resolveAnthropicApiKey(context);
        if (!anthropicApiKey) {
          return new Response(
            JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        let ownerId: string;
        try {
          ownerId = await resolveAssistantOwnerId(context, clientId);
        } catch (ownerError) {
          return new Response(
            JSON.stringify({ error: ownerError instanceof Error ? ownerError.message : "Failed to resolve owner" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const runtime = (context.locals as any).runtime;
        const kv = runtime?.env?.CANVAS_KV as
          | { get: (k: string) => Promise<string | null>; put: (k: string, v: string) => Promise<void> }
          | undefined;
        const kvKey = `assistant-state:${ownerId}`;

        if (kv) {
          const raw = await kv.get(kvKey).catch(() => null);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as OwnerRuntimeSnapshot;
              if (parsed && Array.isArray(parsed.chats) && typeof parsed.messagesByChat === "object") {
                hydrateOwnerState(ownerId, parsed);
              }
            } catch { /* ignore */ }
          }
        }

        let session: ChatStreamSession;
        try {
          session = prepareChatStreamSession(ownerId, chatId, payload, {
            textModel: "claude-sonnet-4-20250514",
          });
        } catch (sessionError) {
          return new Response(
            JSON.stringify({ error: sessionError instanceof Error ? sessionError.message : "Failed to prepare session" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
        const writer = writable.getWriter();
        const sendEvent = (data: object) =>
          writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        const streamPromise = (async () => {
          try {
            await sendEvent({ type: "user_message", message: session.userMessage });
            let fullText = "";
            for await (const chunk of streamTextWithClaude({
              apiKey: anthropicApiKey,
              prompt: session.prompt,
              system: session.system,
              model: session.textModel,
            })) {
              fullText += chunk;
              await sendEvent({ type: "text_delta", text: chunk });
            }
            const assistantMessage = session.complete(fullText);
            await sendEvent({ type: "done", message: assistantMessage });
            if (kv) {
              const snapshot = exportOwnerState(ownerId);
              await kv.put(kvKey, JSON.stringify(snapshot)).catch(() => { /* ignore */ });
            }
          } catch (streamError) {
            const errMsg = streamError instanceof Error ? streamError.message : "Stream failed";
            session.fail(`Generation failed: ${errMsg}`);
            await sendEvent({ type: "error", error: errMsg }).catch(() => { /* ignore */ });
          } finally {
            await writer.close().catch(() => { /* ignore */ });
          }
        })();

        runtime?.ctx?.waitUntil?.(streamPromise);

        return new Response(readable as unknown as ReadableStream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      }
    }

    const gateway = createAssistantGateway(context);
    const result = await gateway.sendMessage({ clientId, chatId, payload });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[assistant/messages] POST failed", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: errorStatus(error, 500), headers: { "Content-Type": "application/json" } },
    );
  }
};
