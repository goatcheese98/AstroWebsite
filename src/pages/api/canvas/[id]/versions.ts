/**
 * Canvas Version Endpoints
 * POST /api/canvas/:id/versions — create a named version snapshot
 * GET  /api/canvas/:id/versions — list all versions
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { getCanvasByIdAndUser, createCanvasVersion, getCanvasVersions, updateCanvas } from '@/lib/db';
import {
  generateCanvasVersionKey,
  loadCanvasFromR2,
  saveCanvasToR2,
  loadCanvasFromR2Compressed,
  saveCanvasToR2Compressed,
} from '@/lib/storage/canvas-storage';
import { successResponse, apiErrors } from '@/lib/utils/api-response';

export const prerender = false;

// List versions
export const GET: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const canvasId = context.params.id;
    if (!canvasId) {
      return apiErrors.badRequest('Invalid request', 'Canvas ID required');
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB) {
      return apiErrors.databaseError('D1 database is not available');
    }

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return apiErrors.notFound('Canvas');
    }

    const versions = await getCanvasVersions(runtime.env.DB, canvasId);

    return successResponse({ versions });
  } catch (error) {
    console.error('Version list error:', error);
    return apiErrors.serverError(
      'Failed to list versions',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

// Create version snapshot
export const POST: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const canvasId = context.params.id;
    if (!canvasId) {
      return apiErrors.badRequest('Invalid request', 'Canvas ID required');
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return apiErrors.storageError('Database or R2 storage is not available');
    }

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return apiErrors.notFound('Canvas');
    }

    // Load current canvas data (canvas now has camelCase properties from Drizzle)
    const currentData = await loadCanvasFromR2Compressed(runtime.env.CANVAS_STORAGE, canvas.r2Key);
    if (!currentData) {
      return apiErrors.storageError('Canvas data not found in storage');
    }

    // Determine next version number
    const existingVersions = await getCanvasVersions(runtime.env.DB, canvasId);
    const nextVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map(v => v.version)) + 1
      : 1;

    // Save snapshot to R2 (compressed)
    const versionKey = generateCanvasVersionKey(auth.userId, canvasId, nextVersion);
    await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, versionKey, currentData);

    // Create D1 record
    const versionRecord = await createCanvasVersion(
      runtime.env.DB,
      canvasId,
      nextVersion,
      versionKey
    );

    // Update canvas version counter using Drizzle
    await updateCanvas(runtime.env.DB, canvasId, auth.userId, {
      version: nextVersion,
    });

    return successResponse(
      {
        version: versionRecord,
        message: `Version ${nextVersion} created`,
      },
      201
    );
  } catch (error) {
    console.error('Version create error:', error);
    return apiErrors.serverError(
      'Failed to create version',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
