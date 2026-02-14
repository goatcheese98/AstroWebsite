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
import { parseCanvasMetadata } from '@/lib/types/excalidraw';
import { successResponse, apiErrors } from '@/lib/utils/api-response';

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
      return apiErrors.databaseError('D1 database is not available');
    }

    // Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = {
      limit: url.searchParams.get('limit') || undefined,
      offset: url.searchParams.get('offset') || undefined,
      sort: url.searchParams.get('sort') || undefined,
      order: url.searchParams.get('order') || undefined,
    };

    const validation = validateListCanvasesQuery(queryParams);
    if (!validation.success) {
      return apiErrors.validationError(`${validation.error}: ${validation.details}`);
    }

    const { limit, offset } = validation.data;




    // Get user's canvases (now returns camelCase properties from Drizzle)
    const canvases = await getUserCanvases(runtime.env.DB, auth.userId, limit, offset);

    // Transform canvases to response format
    const canvasesResponse = canvases.map((canvas) => ({
      id: canvas.id,
      userId: canvas.userId,
      title: canvas.title,
      description: canvas.description,
      thumbnailUrl: canvas.thumbnailUrl,
      isPublic: canvas.isPublic,
      version: canvas.version,
      createdAt: canvas.createdAt,
      updatedAt: canvas.updatedAt,
      metadata: parseCanvasMetadata(canvas.metadata),
      sizeBytes: canvas.sizeBytes ?? 0,
    }));

    const response: CanvasListResponse = {
      canvases: canvasesResponse,
      total: canvasesResponse.length,
      limit,
      offset,
    };

    const responseJson = JSON.stringify(response);

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
