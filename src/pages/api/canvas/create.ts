/**
 * Canvas Creation Endpoint
 * POST /api/canvas/create
 * Creates a new canvas and stores it in R2
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { validateCreateCanvasRequest } from '@/lib/schemas/canvas.schema';
import type { CanvasResponse, CanvasErrorResponse } from '@/lib/schemas/canvas.schema';
import { createCanvas } from '@/lib/db';
import {
  generateCanvasKey,
  generateThumbnailKey,
  saveCanvasToR2Compressed,
  saveThumbnailToR2,
  isCanvasTooLarge,
} from '@/lib/storage/canvas-storage';
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

    const validation = validateCreateCanvasRequest(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: validation.error,
          details: validation.details,
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { title, description, canvasData, isPublic, thumbnailData } = validation.data;
    let finalTitle = title || 'Untitled Canvas';

    // Unique Title Logic
    if (finalTitle.startsWith('Untitled Canvas')) {
      const existing = await runtime.env.DB.prepare(
        'SELECT title FROM canvases WHERE user_id = ? AND title LIKE ?'
      )
        .bind(auth.userId, 'Untitled Canvas%')
        .all();

      if (existing.results && existing.results.length > 0) {
        let maxNum = 0;
        const hasExact = (existing.results as any[]).some((r: any) => r.title === 'Untitled Canvas');
        if (hasExact) maxNum = 1;

        const regex = /^Untitled Canvas (\d+)$/;
        for (const row of (existing.results as any[])) {
          const match = (row as any).title.match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }

        if (maxNum > 0) {
          finalTitle = `Untitled Canvas ${maxNum + 1}`;
        } else if (hasExact) {
          finalTitle = 'Untitled Canvas 2';
        }
      }
    }

    // Check canvas size (max 10MB)
    if (isCanvasTooLarge(canvasData)) {
      return new Response(
        JSON.stringify({
          error: 'Canvas too large',
          details: 'Canvas data exceeds 10MB limit',
        } as CanvasErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Canvas creation error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to create canvas',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as CanvasErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
