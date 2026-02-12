/**
 * Canvas Favorite Toggle
 * POST /api/canvas/:id/favorite — toggle favorite status
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { getCanvasByIdAndUser } from '@/lib/db';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const canvasId = context.params.id;
    if (!canvasId) {
      return new Response(
        JSON.stringify({ error: 'Canvas ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return new Response(
        JSON.stringify({ error: 'Canvas not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse current metadata
    const row = await runtime.env.DB
      .prepare('SELECT metadata FROM canvases WHERE id = ?')
      .bind(canvasId)
      .first<{ metadata: string | null }>();

    let metadata: Record<string, any> = {};
    if (row?.metadata) {
      try { metadata = JSON.parse(row.metadata); } catch { metadata = {}; }
    }

    // Toggle favorite
    const isFavorite = !metadata.isFavorite;
    metadata.isFavorite = isFavorite;

    await runtime.env.DB
      .prepare('UPDATE canvases SET metadata = ? WHERE id = ?')
      .bind(JSON.stringify(metadata), canvasId)
      .run();

    return new Response(
      JSON.stringify({ isFavorite }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Favorite toggle error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to toggle favorite' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
