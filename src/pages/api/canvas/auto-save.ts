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
  saveCanvasToR2Compressed,
  validateCanvasData,
  getCanvasDataSize,
  isCanvasTooLarge,
} from '@/lib/storage/canvas-storage';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) {
      return auth.response;
    }

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
        // Check for exact "Untitled Canvas"
        const hasExact = existing.results.some((r: any) => r.title === 'Untitled Canvas');
        if (hasExact) maxNum = 1; // At least one exists, so next should be 2+

        // Check for "Untitled Canvas X"
        const regex = /^Untitled Canvas (\d+)$/;
        for (const row of existing.results) {
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
          finalTitle = 'Untitled Canvas 2'; // Fallback if my logic above was slightly off
        }
      }
    }

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

    // Save to R2 (compressed)
    const compressedSize = await saveCanvasToR2Compressed(runtime.env.CANVAS_STORAGE, r2Key, canvasData);

    // Create D1 record with the SAME ID used for R2
    const canvas = await createCanvas(runtime.env.DB, {
      id: canvasId, // Pass the same ID used for R2 key
      userId: auth.userId,
      title: finalTitle,
      r2Key,
    });

    // Update size_bytes (use compressed size)
    await runtime.env.DB
      .prepare('UPDATE canvases SET size_bytes = ? WHERE id = ?')
      .bind(compressedSize, canvas.id)
      .run();

    return new Response(
      JSON.stringify({
        canvasId: canvas.id,
        savedAt: new Date().toISOString(),
        sizeBytes: compressedSize,
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
