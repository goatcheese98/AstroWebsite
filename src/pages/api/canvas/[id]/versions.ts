/**
 * Canvas Version Endpoints
 * POST /api/canvas/:id/versions — create a named version snapshot
 * GET  /api/canvas/:id/versions — list all versions
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { getCanvasByIdAndUser, createCanvasVersion, getCanvasVersions } from '@/lib/db';
import {
  generateCanvasVersionKey,
  loadCanvasFromR2,
  saveCanvasToR2,
  loadCanvasFromR2Compressed,
  saveCanvasToR2Compressed,
} from '@/lib/storage/canvas-storage';

export const prerender = false;

// List versions
export const GET: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const canvasId = context.params.id;
    if (!canvasId) {
      return new Response(JSON.stringify({ error: 'Canvas ID required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return new Response(JSON.stringify({ error: 'Canvas not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const versions = await getCanvasVersions(runtime.env.DB, canvasId);

    return new Response(JSON.stringify({ versions }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Version list error:', error);
    return new Response(JSON.stringify({ error: 'Failed to list versions' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Create version snapshot
export const POST: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const canvasId = context.params.id;
    if (!canvasId) {
      return new Response(JSON.stringify({ error: 'Canvas ID required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB || !runtime?.env.CANVAS_STORAGE) {
      return new Response(JSON.stringify({ error: 'Storage not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const canvas = await getCanvasByIdAndUser(runtime.env.DB, canvasId, auth.userId);
    if (!canvas) {
      return new Response(JSON.stringify({ error: 'Canvas not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load current canvas data (compressed or not)
    const currentData = await loadCanvasFromR2Compressed(runtime.env.CANVAS_STORAGE, canvas.r2_key);
    if (!currentData) {
      return new Response(JSON.stringify({ error: 'Canvas data not found in storage' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine next version number
    const existingVersions = await getCanvasVersions(runtime.env.DB, canvasId);
    const nextVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map(v => v.version)) + 1
      : 1;

    // Save snapshot to R2
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

    // Update canvas version counter
    await runtime.env.DB
      .prepare('UPDATE canvases SET version = ? WHERE id = ?')
      .bind(nextVersion, canvasId)
      .run();

    return new Response(JSON.stringify({
      version: versionRecord,
      message: `Version ${nextVersion} created`,
    }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Version create error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create version' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
