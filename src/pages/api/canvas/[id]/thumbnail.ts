/**
 * Canvas Thumbnail API
 * POST /api/canvas/:id/thumbnail — upload thumbnail PNG to R2
 * GET /api/canvas/:id/thumbnail — serve thumbnail with cache headers
 */

import type { APIRoute } from 'astro';
import { requireAuth, optionalAuth } from '@/lib/middleware/auth-middleware';
import { getCanvasByIdAndUser, getCanvasById } from '@/lib/db';
import { generateThumbnailKey } from '@/lib/storage/canvas-storage';
import { successResponse, apiErrors } from '@/lib/utils/api-response';

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
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(
        JSON.stringify({ error: 'Storage not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify canvas ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return new Response(
        JSON.stringify({ error: 'Canvas not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read PNG body
    const body = await context.request.arrayBuffer();
    if (body.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.byteLength > 2 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Thumbnail too large (max 2MB)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const r2Key = generateThumbnailKey(auth.userId, canvasId);

    await runtime.env.CANVAS_STORAGE.put(r2Key, body, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400',
      },
    });

    // Update thumbnail_url in D1
    const thumbnailUrl = `/api/canvas/${canvasId}/thumbnail`;
    await runtime.env.DB
      .prepare('UPDATE canvases SET thumbnail_url = ? WHERE id = ?')
      .bind(thumbnailUrl, canvasId)
      .run();

    return new Response(
      JSON.stringify({ thumbnailUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Upload failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async (context) => {
  try {
    const canvasId = context.params.id;
    if (!canvasId) {
      return new Response('Not found', { status: 404 });
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response('Storage not configured', { status: 500 });
    }

    // Find the canvas to get the owner's user_id for R2 key
    const canvas = await getCanvasById(runtime.env.DB, canvasId);
    if (!canvas) {
      return new Response('Not found', { status: 404 });
    }

    const r2Key = generateThumbnailKey(canvas.userId, canvasId);
    const object = await runtime.env.CANVAS_STORAGE.get(r2Key);

    if (!object) {
      return new Response('No thumbnail', { status: 404 });
    }

    return new Response(object.body as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Thumbnail fetch error:', error);
    return new Response('Error', { status: 500 });
  }
};
