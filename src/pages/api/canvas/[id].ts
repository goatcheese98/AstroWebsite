/**
 * Canvas CRUD Endpoint
 * GET    /api/canvas/:id - Get canvas by ID
 * PUT    /api/canvas/:id - Update canvas
 * DELETE /api/canvas/:id - Delete canvas
 */

import type { APIRoute } from 'astro';
import { requireAuth, optionalAuth } from '@/lib/middleware/auth-middleware';
import { validateUpdateCanvasRequest } from '@/lib/schemas/canvas.schema';
import type { CanvasResponse, CanvasErrorResponse } from '@/lib/schemas/canvas.schema';
import {
  getCanvasById,
  getCanvasByIdAndUser,
  updateCanvas,
  deleteCanvas,
  createCanvasVersion,
} from '@/lib/db';
import {
  generateCanvasKey,
  generateCanvasVersionKey,
  generateThumbnailKey,
  loadCanvasFromR2,
  saveCanvasToR2,
  saveThumbnailToR2,
  deleteAllCanvasFiles,
  isCanvasTooLarge,
} from '@/lib/storage/canvas-storage';

export const prerender = false;

// ============================================================================
// GET Canvas
// ============================================================================

export const GET: APIRoute = async (context) => {
  try {
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
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(
        JSON.stringify({
          error: 'Storage not configured',
          details: 'Database or R2 storage is not available',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for optional session (public canvases are visible without login)
    const auth = await optionalAuth(context);

    // Get canvas metadata
    const canvas = await getCanvasById(runtime.env.DB, canvasId);

    if (!canvas) {
      return new Response(
        JSON.stringify({
          error: 'Canvas not found',
          details: 'The requested canvas does not exist',
        } as CanvasErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const isOwner = auth.userId === canvas.user_id;
    const isPublic = canvas.is_public === 1;

    if (!isOwner && !isPublic) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          details: 'You do not have permission to view this canvas',
        } as CanvasErrorResponse),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Canvas fetch error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch canvas',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================================
// UPDATE Canvas
// ============================================================================

export const PUT: APIRoute = async (context) => {
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
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(
        JSON.stringify({
          error: 'Storage not configured',
          details: 'Database or R2 storage is not available',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
          details: 'Request body must be valid JSON',
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateUpdateCanvasRequest(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: validation.error,
          details: validation.details,
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { title, description, canvasData, isPublic, thumbnailData, createVersion } = validation.data;

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);

    if (!canvas) {
      return new Response(
        JSON.stringify({
          error: 'Canvas not found',
          details: 'Canvas does not exist or you do not have permission to edit it',
        } as CanvasErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update canvas data if provided
    let newR2Key = canvas.r2_key;
    let newVersion = canvas.version;

    if (canvasData) {
      // Check canvas size
      if (isCanvasTooLarge(canvasData)) {
        return new Response(
          JSON.stringify({
            error: 'Canvas too large',
            details: 'Canvas data exceeds 10MB limit',
          } as CanvasErrorResponse),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create version if requested
      if (createVersion) {
        newVersion = canvas.version + 1;
        const versionKey = generateCanvasVersionKey(auth.userId, canvasId, canvas.version);

        // Save current version
        const currentData = await loadCanvasFromR2(runtime.env.CANVAS_STORAGE, canvas.r2_key);
        if (currentData) {
          await saveCanvasToR2(runtime.env.CANVAS_STORAGE, versionKey, currentData);
          await createCanvasVersion(runtime.env.DB, canvasId, canvas.version, versionKey);
        }
      }

      // Save updated canvas data
      await saveCanvasToR2(runtime.env.CANVAS_STORAGE, canvas.r2_key, canvasData);
    }

    // Update thumbnail if provided
    if (thumbnailData) {
      const thumbnailKey = generateThumbnailKey(auth.userId, canvasId);
      const thumbnailBuffer = Buffer.from(thumbnailData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await saveThumbnailToR2(runtime.env.CANVAS_STORAGE, thumbnailKey, thumbnailBuffer);
    }

    // Update metadata in database
    const updatedCanvas = await updateCanvas(runtime.env.DB, canvasId, auth.userId, {
      title,
      description,
      isPublic,
      version: createVersion ? newVersion : undefined,
    });

    if (!updatedCanvas) {
      return new Response(
        JSON.stringify({
          error: 'Update failed',
          details: 'Failed to update canvas metadata',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load final canvas data
    const finalCanvasData = await loadCanvasFromR2(runtime.env.CANVAS_STORAGE, updatedCanvas.r2_key);

    // Build response
    const response: CanvasResponse = {
      id: updatedCanvas.id,
      userId: updatedCanvas.user_id,
      title: updatedCanvas.title,
      description: updatedCanvas.description,
      thumbnailUrl: updatedCanvas.thumbnail_url,
      isPublic: updatedCanvas.is_public === 1,
      version: updatedCanvas.version,
      createdAt: updatedCanvas.created_at,
      updatedAt: updatedCanvas.updated_at,
      canvasData: finalCanvasData!,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Canvas update error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to update canvas',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================================
// PATCH Canvas (lightweight auto-save — data only, no version creation)
// ============================================================================

export const PATCH: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const canvasId = context.params.id;
    if (!canvasId) {
      return new Response(
        JSON.stringify({ error: 'Canvas ID is required' }),
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

    let canvasData: any;
    try {
      canvasData = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!canvasData || !Array.isArray(canvasData.elements)) {
      return new Response(
        JSON.stringify({ error: 'Invalid canvas data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return new Response(
        JSON.stringify({ error: 'Canvas not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check size
    if (isCanvasTooLarge(canvasData)) {
      return new Response(
        JSON.stringify({ error: 'Canvas data exceeds 10MB limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save to R2 (overwrites current data)
    await saveCanvasToR2(runtime.env.CANVAS_STORAGE, canvas.r2_key, canvasData);

    // Update D1 metadata
    const now = Math.floor(Date.now() / 1000);
    const sizeBytes = new TextEncoder().encode(JSON.stringify(canvasData)).length;

    await runtime.env.DB
      .prepare('UPDATE canvases SET updated_at = ?, size_bytes = ? WHERE id = ? AND user_id = ?')
      .bind(now, sizeBytes, canvasId, auth.userId)
      .run();

    return new Response(
      JSON.stringify({
        canvasId,
        savedAt: new Date().toISOString(),
        sizeBytes,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Canvas auto-save error:', error);
    return new Response(
      JSON.stringify({ error: 'Auto-save failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================================
// DELETE Canvas
// ============================================================================

export const DELETE: APIRoute = async (context) => {
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
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(
        JSON.stringify({
          error: 'Storage not configured',
          details: 'Database or R2 storage is not available',
        } as CanvasErrorResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete from database (also verifies ownership)
    const deleted = await deleteCanvas(runtime.env.DB, canvasId, auth.userId);

    if (!deleted) {
      return new Response(
        JSON.stringify({
          error: 'Canvas not found',
          details: 'Canvas does not exist or you do not have permission to delete it',
        } as CanvasErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete all R2 files (canvas, versions, thumbnail)
    await deleteAllCanvasFiles(runtime.env.CANVAS_STORAGE, auth.userId, canvasId);

    return new Response(
      JSON.stringify({ success: true, message: 'Canvas deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Canvas deletion error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to delete canvas',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
