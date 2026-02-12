/**
 * Anonymous → Authenticated Canvas Migration
 * POST /api/user/migrate-anonymous
 * Transfers localStorage canvas data to the authenticated user's R2 storage
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

    const { anonymousId, canvasData, title } = body;

    if (!anonymousId || typeof anonymousId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'anonymousId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Check if this anonymous canvas was already migrated
    const existing = await runtime.env.DB
      .prepare('SELECT id FROM canvases WHERE anonymous_id = ? AND user_id = ?')
      .bind(anonymousId, auth.userId)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({
          canvasId: (existing as any).id,
          alreadyMigrated: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the canvas for the authenticated user
    const { nanoid } = await import('nanoid');
    const canvasId = nanoid();
    const r2Key = generateCanvasKey(auth.userId, canvasId);
    const sizeBytes = getCanvasDataSize(canvasData);

    // Save to R2
    await saveCanvasToR2(runtime.env.CANVAS_STORAGE, r2Key, canvasData);

    // Create D1 record with anonymous_id for dedup
    const canvas = await createCanvas(runtime.env.DB, {
      userId: auth.userId,
      title: title || 'Migrated Canvas',
      r2Key,
    });

    // Update anonymous_id and size_bytes
    await runtime.env.DB
      .prepare('UPDATE canvases SET anonymous_id = ?, size_bytes = ? WHERE id = ?')
      .bind(anonymousId, sizeBytes, canvas.id)
      .run();

    return new Response(
      JSON.stringify({
        canvasId: canvas.id,
        migrated: true,
        sizeBytes,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
