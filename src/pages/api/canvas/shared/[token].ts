/**
 * Shared Canvas Endpoint
 * GET /api/canvas/shared/:token - Get canvas by share token
 * Allows public access to a shared canvas
 */

import type { APIRoute } from 'astro';
import type { CanvasResponse, CanvasErrorResponse } from '@/lib/schemas/canvas.schema';
import { getCanvasShare, getCanvasById } from '@/lib/db';
import { loadCanvasFromR2 } from '@/lib/storage/canvas-storage';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const shareToken = context.params.token;

    if (!shareToken) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: 'Share token is required',
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(
        JSON.stringify({
          error: 'Storage not configured',
          details: 'Database or R2 storage is not available',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get share record (includes expiration check)
    const share = await getCanvasShare(runtime.env.DB, shareToken);

    if (!share) {
      return new Response(
        JSON.stringify({
          error: 'Share link not found or expired',
          details: 'The share link you are trying to access does not exist or has expired',
        } as CanvasErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get canvas
    const canvas = await getCanvasById(runtime.env.DB, share.canvas_id);

    if (!canvas) {
      return new Response(
        JSON.stringify({
          error: 'Canvas not found',
          details: 'The shared canvas no longer exists',
        } as CanvasErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load canvas data from R2
    const canvasData = await loadCanvasFromR2(runtime.env.CANVAS_STORAGE, canvas.r2_key);

    if (!canvasData) {
      return new Response(
        JSON.stringify({
          error: 'Canvas data not found',
          details: 'Canvas metadata exists but data is missing from storage',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build response
    const response: CanvasResponse = {
      id: canvas.id,
      userId: canvas.user_id,
      title: canvas.title,
      description: canvas.description,
      thumbnailUrl: canvas.thumbnail_url,
      isPublic: canvas.is_public === 1,
      version: canvas.version,
      createdAt: canvas.created_at,
      updatedAt: canvas.updated_at,
      canvasData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Shared canvas fetch error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch shared canvas',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
