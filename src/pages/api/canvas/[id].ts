/**
 * Canvas CRUD Endpoint
 * GET    /api/canvas/:id - Get canvas by ID
 * PUT    /api/canvas/:id - Update canvas
 * DELETE /api/canvas/:id - Delete canvas
 */

import type { APIRoute } from 'astro';
import { requireAuth, optionalAuth } from '@/lib/middleware/auth-middleware';
import { validateUpdateCanvasRequest } from '@/lib/schemas/canvas.schema';
import type { CanvasResponse, CanvasErrorResponse, CanvasData } from '@/lib/schemas/canvas.schema';
import { successResponse, apiErrors } from '@/lib/utils/api-response';
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
  loadCanvasFromR2Compressed,
  saveCanvasToR2Compressed,
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
      return apiErrors.badRequest('Invalid request', 'Canvas ID is required');
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return apiErrors.storageError('Database or R2 storage is not available');
    }

    // Check for optional session (public canvases are visible without login)
    const auth = await optionalAuth(context);

    // Get canvas metadata
    const canvas = await getCanvasById(runtime.env.DB, canvasId);

    if (!canvas) {
      return apiErrors.notFound('Canvas');
    }

    // Check permissions (canvas now has camelCase properties from Drizzle)
    const isOwner = auth.userId === canvas.userId;
    const isPublic = canvas.isPublic;

    if (!isOwner && !isPublic) {
      return apiErrors.forbidden('You do not have permission to view this canvas');
    }

    // Load canvas data from R2 (auto-detects gzip)
    const canvasData = await loadCanvasFromR2Compressed(runtime.env.CANVAS_STORAGE, canvas.r2Key);

    if (!canvasData) {
      return apiErrors.storageError('Canvas metadata exists but data is missing from storage');
    }

    // Build response
    const response: CanvasResponse = {
      id: canvas.id,
      userId: canvas.userId,
      title: canvas.title,
      description: canvas.description,
      thumbnailUrl: canvas.thumbnailUrl,
      isPublic: canvas.isPublic,
      version: canvas.version,
      createdAt: canvas.createdAt,
      updatedAt: canvas.updatedAt,
      canvasData: canvasData as any,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Canvas fetch error:', error);
    return apiErrors.serverError(
      'Failed to fetch canvas',
      error instanceof Error ? error.message : 'Unknown error'
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
      return apiErrors.badRequest('Invalid request', 'Canvas ID is required');
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return apiErrors.storageError('Database or R2 storage is not available');
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
      return apiErrors.notFound('Canvas');
    }

    // Update canvas data if provided
    let newR2Key = canvas.r2Key;
    let newVersion = canvas.version;

    if (canvasData) {
      // Check canvas size
      if (isCanvasTooLarge(canvasData as any)) {
        return apiErrors.badRequest('Canvas too large', 'Canvas data exceeds 50MB limit');
      }

      // Create version if requested
      if (createVersion) {
        newVersion = canvas.version + 1;
        const versionKey = generateCanvasVersionKey(auth.userId, canvasId, canvas.version);

        // Save current version
        const currentData = await loadCanvasFromR2Compressed(runtime.env.CANVAS_STORAGE, canvas.r2Key);
        if (currentData) {
          await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, versionKey, currentData);
          await createCanvasVersion(runtime.env.DB, canvasId, canvas.version, versionKey);
        }
      }

      // Save updated canvas data (compressed)
      await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, canvas.r2Key, canvasData as any);
    }

    // Update thumbnail if provided
    if (thumbnailData) {
      const thumbnailKey = generateThumbnailKey(auth.userId, canvasId);
      const thumbnailBuffer = Buffer.from(thumbnailData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await saveThumbnailToR2(runtime.env.CANVAS_STORAGE, thumbnailKey, new Uint8Array(thumbnailBuffer).buffer);
    }

    // Update metadata in database
    const updatedCanvas = await updateCanvas(runtime.env.DB, canvasId, auth.userId, {
      title,
      description,
      isPublic,
      version: createVersion ? newVersion : undefined,
    });

    if (!updatedCanvas) {
      return apiErrors.serverError('Update failed', 'Failed to update canvas metadata');
    }

    // Load final canvas data
    const finalCanvasData = await loadCanvasFromR2Compressed(runtime.env.CANVAS_STORAGE, updatedCanvas.r2Key);

    // Build response (updatedCanvas now has camelCase properties from Drizzle)
    const response: CanvasResponse = {
      id: updatedCanvas.id,
      userId: updatedCanvas.userId,
      title: updatedCanvas.title,
      description: updatedCanvas.description,
      thumbnailUrl: updatedCanvas.thumbnailUrl,
      isPublic: updatedCanvas.isPublic,
      version: updatedCanvas.version,
      createdAt: updatedCanvas.createdAt,
      updatedAt: updatedCanvas.updatedAt,
      canvasData: finalCanvasData as any,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Canvas update error:', error);
    return apiErrors.serverError(
      'Failed to update canvas',
      error instanceof Error ? error.message : 'Unknown error'
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
      return apiErrors.badRequest('Invalid request', 'Canvas ID is required');
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return apiErrors.storageError('Database or R2 storage is not available');
    }

    let canvasData: any;
    try {
      canvasData = await context.request.json();
    } catch {
      return apiErrors.invalidJson();
    }

    if (!canvasData || !Array.isArray(canvasData.elements)) {
      return apiErrors.validationError('Invalid canvas data structure');
    }

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return apiErrors.notFound('Canvas');
    }

    // Check size
    if (isCanvasTooLarge(canvasData as any)) {
      return apiErrors.badRequest('Canvas too large', 'Canvas data exceeds 50MB limit');
    }

    // Save to R2 (overwrites current data, compressed)
    const compressedSize = await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, canvas.r2Key, canvasData as any);

    // Update D1 metadata
    const now = Math.floor(Date.now() / 1000);
    // const sizeBytes = new TextEncoder().encode(JSON.stringify(canvasData)).length;

    await runtime.env.DB
      .prepare('UPDATE canvases SET updated_at = ?, size_bytes = ? WHERE id = ? AND user_id = ?')
      .bind(now, compressedSize, canvasId, auth.userId)
      .run();

    return successResponse({
      canvasId,
      savedAt: new Date().toISOString(),
      sizeBytes: compressedSize,
    });
  } catch (error) {
    console.error('Canvas auto-save error:', error);
    return apiErrors.serverError(
      'Auto-save failed',
      error instanceof Error ? error.message : 'Unknown error'
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
      return apiErrors.badRequest('Invalid request', 'Canvas ID is required');
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return apiErrors.storageError('Database or R2 storage is not available');
    }

    // Delete from database (also verifies ownership)
    const deleted = await deleteCanvas(runtime.env.DB, canvasId, auth.userId);

    if (!deleted) {
      return apiErrors.notFound('Canvas');
    }

    // Delete all R2 files (canvas, versions, thumbnail)
    await deleteAllCanvasFiles(runtime.env.CANVAS_STORAGE, auth.userId, canvasId);

    return successResponse({ success: true, message: 'Canvas deleted successfully' });
  } catch (error) {
    console.error('Canvas deletion error:', error);
    return apiErrors.serverError(
      'Failed to delete canvas',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
