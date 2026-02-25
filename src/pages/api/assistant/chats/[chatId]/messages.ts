import type { APIRoute } from "astro";
import type {
  AssistantMode,
  AssistantSendMessageInput,
  SketchComplexity,
  SketchStyle,
} from "@/lib/assistant/types";
import { createAssistantGateway } from "@/lib/assistant/backend-boundary";

export const prerender = false;

function toMode(value: unknown): AssistantMode {
  if (
    value === "mermaid" ||
    value === "d2" ||
    value === "image" ||
    value === "sketch"
  ) {
    return value;
  }
  return "chat";
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
      { status: 400, headers: { "Content-Type": "application/json" } },
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
    const mode = toMode(requestPayload.generation?.mode);

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Message text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: AssistantSendMessageInput = {
      text,
      generation: {
        mode,
        sourceImageDataUrl:
          typeof requestPayload.generation?.sourceImageDataUrl === "string"
            ? requestPayload.generation.sourceImageDataUrl
            : undefined,
        sketch: {
          style: toStyle(requestPayload.generation?.sketch?.style),
          complexity: toComplexity(requestPayload.generation?.sketch?.complexity),
          colorPalette: Number.isFinite(requestPayload.generation?.sketch?.colorPalette)
            ? Number(requestPayload.generation.sketch.colorPalette)
            : 8,
          detailLevel: Number.isFinite(requestPayload.generation?.sketch?.detailLevel)
            ? Number(requestPayload.generation.sketch.detailLevel)
            : 0.7,
          edgeSensitivity: Number.isFinite(requestPayload.generation?.sketch?.edgeSensitivity)
            ? Number(requestPayload.generation.sketch.edgeSensitivity)
            : 18,
        },
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
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
