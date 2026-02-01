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

    // Get user's canvases
    const canvases = await getUserCanvases(runtime.env.DB, auth.userId, limit, offset);

    // Transform to response format
    const canvasesResponse = canvases.map((canvas) => ({
      id: canvas.id,
      userId: canvas.user_id,
      title: canvas.title,
      description: canvas.description,
      thumbnailUrl: canvas.thumbnail_url,
      isPublic: canvas.is_public === 1,
      version: canvas.version,
      createdAt: canvas.created_at,
      updatedAt: canvas.updated_at,
    }));

    const response: CanvasListResponse = {
      canvases: canvasesResponse,
      total: canvasesResponse.length,
      limit,
      offset,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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
