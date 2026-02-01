/**
 * Canvas Share Endpoint
 * POST /api/canvas/:id/share - Create share link
 * Generates a public share token for a canvas
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { CreateShareRequestSchema } from '@/lib/schemas/canvas.schema';
import type { ShareLinkResponse, CanvasErrorResponse } from '@/lib/schemas/canvas.schema';
import { getCanvasByIdAndUser } from '@/lib/db';
import { createCanvasShare } from '@/lib/db';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Require authentication
    const auth = await requireAuth(context);
    if (!auth.authenticated) {
      return auth.response;
    }

    const canvasId = context.params.id;

    if (!canvasId) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: 'Canvas ID is required',
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);

    if (!canvas) {
      return new Response(
        JSON.stringify({
          error: 'Canvas not found',
          details: 'Canvas does not exist or you do not have permission to share it',
        } as CanvasErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (optional)
    let expiresInDays: number | undefined;
    try {
      const body = await context.request.json();
      const validation = CreateShareRequestSchema.safeParse(body);
      if (validation.success) {
        expiresInDays = validation.data.expiresInDays;
      }
    } catch {
      // No body or invalid body, use defaults
    }

    // Create share link
    const share = await createCanvasShare(runtime.env.DB, canvasId, expiresInDays);

    // Build share URL
    const baseUrl = context.url.origin;
    const shareUrl = `${baseUrl}/canvas/shared/${share.share_token}`;

    const response: ShareLinkResponse = {
      shareToken: share.share_token,
      shareUrl,
      expiresAt: share.expires_at,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Share creation error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to create share link',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
