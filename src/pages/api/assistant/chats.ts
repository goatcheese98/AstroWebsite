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
      { status: errorStatus(error, 400), headers: { "Content-Type": "application/json" } },
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
      { status: errorStatus(error, 400), headers: { "Content-Type": "application/json" } },
    );
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const requestBody = await context.request
      .clone()
      .json()
      .catch(() => ({} as Record<string, unknown>));
    const clientId = url.searchParams.get("clientId")
      || (typeof requestBody.clientId === "string" ? requestBody.clientId : undefined)
      || undefined;

    const gateway = createAssistantGateway(context);
    const cleared = await gateway.clearChats({ clientId });

    return new Response(JSON.stringify({ cleared }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[assistant/chats] DELETE failed", error);
    return new Response(
      JSON.stringify({
        error: "Failed to clear chat history",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: errorStatus(error, 400), headers: { "Content-Type": "application/json" } },
    );
  }
};
