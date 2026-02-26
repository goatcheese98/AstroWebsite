import type { APIRoute } from "astro";
import { createAssistantGateway } from "@/lib/assistant/backend-boundary";

export const prerender = false;

function errorStatus(error: unknown, fallback: number): number {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number" && status >= 400 && status <= 599) {
    return status;
  }
  return fallback;
}

export const DELETE: APIRoute = async (context) => {
  try {
    const chatId = context.params.chatId;
    if (!chatId) {
      return new Response(JSON.stringify({ error: "chatId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(context.request.url);
    const requestBody = await context.request
      .clone()
      .json()
      .catch(() => ({} as Record<string, unknown>));
    const clientId = url.searchParams.get("clientId")
      || (typeof requestBody.clientId === "string" ? requestBody.clientId : undefined)
      || undefined;

    const gateway = createAssistantGateway(context);
    const deleted = await gateway.deleteChat({ clientId, chatId });

    if (!deleted) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ deleted: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[assistant/chat] DELETE failed", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete chat",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: errorStatus(error, 400), headers: { "Content-Type": "application/json" } },
    );
  }
};
