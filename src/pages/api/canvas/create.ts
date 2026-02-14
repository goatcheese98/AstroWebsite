/**
 * Canvas Creation Endpoint
 * POST /api/canvas/create
 * Creates a new canvas and stores it in R2
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { validateCreateCanvasRequest } from '@/lib/schemas/canvas.schema';
import type { CanvasResponse } from '@/lib/schemas/canvas.schema';
import { createCanvas } from '@/lib/db';
import {
  generateCanvasKey,
  generateThumbnailKey,
  saveCanvasToR2Compressed,
  saveThumbnailToR2,
  isCanvasTooLarge,
} from '@/lib/storage/canvas-storage';
import { generateUniqueCanvasName } from '@/lib/utils/canvas-naming';
import { successResponse, apiErrors } from '@/lib/utils/api-response';
import { withErrorHandling, StorageError } from '@/lib/utils/error-handling';
import { nanoid } from 'nanoid';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Require authentication
    const auth = await requireAuth(context);
    if (!auth.authenticated) {
      return auth.response;
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
      return apiErrors.invalidJson();
    }

    const validation = validateCreateCanvasRequest(body);
    if (!validation.success) {
      return apiErrors.validationError(`${validation.error}: ${validation.details}`);
    }

    const { title, description, canvasData, isPublic, thumbnailData } = validation.data;

    // Generate unique title using utility function
    const finalTitle = await generateUniqueCanvasName(
      runtime.env.DB,
      auth.userId,
      title || 'Untitled Canvas'
    );

    // Check canvas size (max 10MB)
    if (isCanvasTooLarge(canvasData)) {
      return apiErrors.badRequest(
        'Canvas too large',
        'Canvas data exceeds 10MB limit'
      );
    }

    // Generate canvas ID and R2 keys
    const canvasId = nanoid();
    const r2Key = generateCanvasKey(auth.userId, canvasId);
    const thumbnailKey = thumbnailData ? generateThumbnailKey(auth.userId, canvasId) : null;

    // Save canvas data to R2 (compressed)
    await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, r2Key, canvasData);

    // Save thumbnail if provided
    if (thumbnailData && thumbnailKey) {
      // Decode base64 thumbnail
      const thumbnailBuffer = Buffer.from(thumbnailData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await saveThumbnailToR2(runtime.env.CANVAS_STORAGE, thumbnailKey, new Uint8Array(thumbnailBuffer).buffer);
    }

    // Create canvas record in database with the SAME ID used for R2
    const canvas = await createCanvas(runtime.env.DB, {
      id: canvasId, // Pass the same ID used for R2 key
      userId: auth.userId,
      title: finalTitle,
      description,
      r2Key,
      thumbnailUrl: thumbnailKey ?? undefined,
      isPublic: isPublic || false,
    });

    // Build response (canvas now has camelCase properties from Drizzle)
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
      canvasData,
    };

    return successResponse(response, 201);
  } catch (error) {
    console.error('Canvas creation error:', error);
    return apiErrors.serverError(
      'Failed to create canvas',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
