import type { APIRoute } from "astro";
import { createAssistantGateway } from "@/lib/assistant/backend-boundary";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const clientId = url.searchParams.get("clientId") || undefined;

    const gateway = createAssistantGateway(context);
    const chats = await gateway.listChats({ clientId });

    return new Response(JSON.stringify({ chats }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[assistant/chats] GET failed", error);
    return new Response(
      JSON.stringify({
        error: "Failed to list chats",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request
      .clone()
      .json()
      .catch(() => ({} as Record<string, unknown>));
    const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
    const title = typeof body.title === "string" ? body.title : undefined;

    const gateway = createAssistantGateway(context);
    const chat = await gateway.createChat({ clientId, title });

    return new Response(JSON.stringify({ chat }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[assistant/chats] POST failed", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create chat",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
};
