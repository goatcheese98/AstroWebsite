import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: 'Deprecated endpoint',
      details: 'Image generation moved to the independent assistant backend worker via /api/assistant/* job flow.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
