/**
 * Auto-save endpoint — creates a new canvas on first save
 * POST /api/canvas/auto-save
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createCanvas } from '@/lib/db';
import {
  generateCanvasKey,
  saveCanvasToR2,
  validateCanvasData,
  getCanvasDataSize,
  isCanvasTooLarge,
} from '@/lib/storage/canvas-storage';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(
        JSON.stringify({ error: 'Storage not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let body: any;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { title, canvasData } = body;

    if (!canvasData || !validateCanvasData(canvasData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid canvas data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (isCanvasTooLarge(canvasData)) {
      return new Response(
        JSON.stringify({ error: 'Canvas data exceeds 10MB limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate R2 key and create the canvas
    const { nanoid } = await import('nanoid');
    const canvasId = nanoid();
    const r2Key = generateCanvasKey(auth.userId, canvasId);
    const sizeBytes = getCanvasDataSize(canvasData);

    // Save to R2
    await saveCanvasToR2(runtime.env.CANVAS_STORAGE, r2Key, canvasData);

    // Create D1 record
    const canvas = await createCanvas(runtime.env.DB, {
      userId: auth.userId,
      title: title || 'Untitled Canvas',
      r2Key,
    });

    // Update size_bytes
    await runtime.env.DB
      .prepare('UPDATE canvases SET size_bytes = ? WHERE id = ?')
      .bind(sizeBytes, canvas.id)
      .run();

    return new Response(
      JSON.stringify({
        canvasId: canvas.id,
        savedAt: new Date().toISOString(),
        sizeBytes,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auto-save error:', error);
    return new Response(
      JSON.stringify({ error: 'Auto-save failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
