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
