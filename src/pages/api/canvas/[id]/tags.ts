/**
 * Canvas Tags Management
 * PUT /api/canvas/:id/tags — replace tags array in canvas metadata
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { getCanvasByIdAndUser } from '@/lib/db';

export const prerender = false;

export const PUT: APIRoute = async (context) => {
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

    let body: any;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { tags } = body;
    if (!Array.isArray(tags) || !tags.every((t: any) => typeof t === 'string')) {
      return new Response(
        JSON.stringify({ error: 'tags must be an array of strings' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Max 10 tags, each max 30 chars
    const sanitizedTags = tags
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0 && t.length <= 30)
      .slice(0, 10);

    // Parse current metadata and update tags
    const row = await runtime.env.DB
      .prepare('SELECT metadata FROM canvases WHERE id = ?')
      .bind(canvasId)
      .first<{ metadata: string | null }>();

    let metadata: Record<string, any> = {};
    if (row?.metadata) {
      try { metadata = JSON.parse(row.metadata); } catch { metadata = {}; }
    }

    metadata.tags = sanitizedTags;

    await runtime.env.DB
      .prepare('UPDATE canvases SET metadata = ? WHERE id = ?')
      .bind(JSON.stringify(metadata), canvasId)
      .run();

    return new Response(
      JSON.stringify({ tags: sanitizedTags }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tags update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update tags' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
