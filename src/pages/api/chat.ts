import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: 'Deprecated endpoint',
      details: 'Use /api/assistant/chats/:chatId/messages with Claude-backed assistant orchestration.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
