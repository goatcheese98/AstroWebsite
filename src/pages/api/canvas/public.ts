/**
 * Public Canvases Endpoint
 * GET /api/canvas/public?limit=20&offset=0
 * Returns list of public canvases (no authentication required)
 */

import type { APIRoute } from 'astro';
import { validateListCanvasesQuery } from '@/lib/schemas/canvas.schema';
import type { CanvasListResponse, CanvasErrorResponse } from '@/lib/schemas/canvas.schema';
import { getPublicCanvases } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
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
      limit: url.searchParams.get('limit') || '20',
      offset: url.searchParams.get('offset') || '0',
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

    // Get public canvases
    const canvases = await getPublicCanvases(runtime.env.DB, limit, offset);

    // Transform to response format
    const canvasesResponse = canvases.map((canvas) => ({
      id: canvas.id,
      userId: canvas.userId,
      title: canvas.title,
      description: canvas.description,
      thumbnailUrl: canvas.thumbnailUrl,
      isPublic: true,
      version: canvas.version,
      createdAt: canvas.createdAt,
      updatedAt: canvas.updatedAt,
    }));

    const response: CanvasListResponse = {
      canvases: canvasesResponse,
      total: canvasesResponse.length,
      limit,
      offset,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('Public canvas list error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch public canvases',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
