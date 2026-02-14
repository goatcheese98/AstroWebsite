/**
 * Auto-save endpoint — creates a new canvas on first save
 * POST /api/canvas/auto-save
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createCanvas, updateCanvas } from '@/lib/db';
import {
  generateCanvasKey,
  saveCanvasToR2,
  saveCanvasToR2Compressed,
  getCanvasDataSize,
  isCanvasTooLarge,
} from '@/lib/storage/canvas-storage';
import { validateCanvasData } from '@/lib/schemas/canvas.schema';
import { generateUniqueCanvasName } from '@/lib/utils/canvas-naming';
import { successResponse, apiErrors } from '@/lib/utils/api-response';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) {
      return auth.response;
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return apiErrors.storageError('Database or R2 storage is not available');
    }

    let body: any;
    try {
      body = await context.request.json();
    } catch {
      return apiErrors.invalidJson();
    }

    const { title, canvasData } = body;

    // Generate unique title using utility function
    const finalTitle = await generateUniqueCanvasName(
      runtime.env.DB,
      auth.userId,
      title || 'Untitled Canvas'
    );

    if (!canvasData || !validateCanvasData(canvasData)) {
      return apiErrors.validationError('Invalid canvas data structure');
    }

    if (isCanvasTooLarge(canvasData as any)) {
      return apiErrors.badRequest(
        'Canvas too large',
        'Canvas data exceeds 50MB limit'
      );
    }

    // Generate R2 key and create the canvas
    const { nanoid } = await import('nanoid');
    const canvasId = nanoid();
    const r2Key = generateCanvasKey(auth.userId, canvasId);
    const sizeBytes = getCanvasDataSize(canvasData as any);

    // Save to R2 (compressed)
    const compressedSize = await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, r2Key, canvasData as any);

    // Create D1 record with the SAME ID used for R2
    const canvas = await createCanvas(runtime.env.DB, {
      id: canvasId, // Pass the same ID used for R2 key
      userId: auth.userId,
      title: finalTitle,
      r2Key,
      sizeBytes: compressedSize,
    });

    return successResponse(
      {
        canvasId: canvas.id,
        savedAt: new Date().toISOString(),
        sizeBytes: compressedSize,
      },
      201
    );
  } catch (error) {
    console.error('Auto-save error:', error);
    return apiErrors.serverError(
      'Auto-save failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
