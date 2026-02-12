/**
 * List User's Canvases Endpoint
 * GET /api/canvas/list?limit=50&offset=0&sort=updated&order=desc
 * Returns list of user's canvases (metadata only, no canvas data)
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { validateListCanvasesQuery } from '@/lib/schemas/canvas.schema';
import type { CanvasListResponse, CanvasErrorResponse } from '@/lib/schemas/canvas.schema';
import { getUserCanvases } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Require authentication
    const auth = await requireAuth(context);
    if (!auth.authenticated) {
      return auth.response;
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'D1 database is not available',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      sort: url.searchParams.get('sort'),
      order: url.searchParams.get('order'),
    };

    const validation = validateListCanvasesQuery(queryParams);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: validation.error,
          details: validation.details,
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { limit, offset } = validation.data;

    // Check KV cache first (5-minute TTL)
    const cacheKey = `canvas-list:${auth.userId}:${limit}:${offset}`;
    const kv = (runtime.env as any).CANVAS_KV as { get: (key: string) => Promise<string | null>; put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void> } | undefined;
    if (kv) {
      try {
        const cached = await kv.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
            },
          });
        }
      } catch {
        // KV unavailable, fall through to DB
      }
    }

    // Get user's canvases
    const canvases = await getUserCanvases(runtime.env.DB, auth.userId, limit, offset);

    // Also fetch metadata for each canvas
    const canvasesResponse = await Promise.all(
      canvases.map(async (canvas) => {
        let metadata = {};
        let sizeBytes = 0;
        try {
          const row = await runtime.env.DB
            .prepare('SELECT metadata, size_bytes FROM canvases WHERE id = ?')
            .bind(canvas.id)
            .first<{ metadata: string | null; size_bytes: number | null }>();
          if (row?.metadata) {
            try { metadata = JSON.parse(row.metadata); } catch { metadata = {}; }
          }
          sizeBytes = row?.size_bytes || 0;
        } catch { /* ignore */ }

        return {
          id: canvas.id,
          userId: canvas.user_id,
          title: canvas.title,
          description: canvas.description,
          thumbnailUrl: canvas.thumbnail_url,
          isPublic: canvas.is_public === 1,
          version: canvas.version,
          createdAt: canvas.created_at,
          updatedAt: canvas.updated_at,
          metadata,
          sizeBytes,
        };
      })
    );

    const response: CanvasListResponse = {
      canvases: canvasesResponse,
      total: canvasesResponse.length,
      limit,
      offset,
    };

    const responseJson = JSON.stringify(response);

    // Cache in KV (5-minute TTL)
    if (kv) {
      try {
        await kv.put(cacheKey, responseJson, { expirationTtl: 300 });
      } catch {
        // KV write failure is non-critical
      }
    }

    return new Response(responseJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Canvas list error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch canvases',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
