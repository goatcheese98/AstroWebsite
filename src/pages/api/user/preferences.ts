/**
 * User Preferences API
 * GET /api/user/preferences — returns user.metadata JSON
 * PATCH /api/user/preferences — merges new preferences into user.metadata
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const row = await runtime.env.DB
      .prepare('SELECT metadata FROM users WHERE id = ?')
      .bind(auth.userId)
      .first<{ metadata: string | null }>();

    let metadata = {};
    if (row?.metadata) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = {};
      }
    }

    return new Response(
      JSON.stringify(metadata),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get preferences error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get preferences' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const runtime = context.locals.runtime;
    if (!runtime?.env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let updates: Record<string, any>;
    try {
      updates = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current metadata
    const row = await runtime.env.DB
      .prepare('SELECT metadata FROM users WHERE id = ?')
      .bind(auth.userId)
      .first<{ metadata: string | null }>();

    let current: Record<string, any> = {};
    if (row?.metadata) {
      try {
        current = JSON.parse(row.metadata);
      } catch {
        current = {};
      }
    }

    // Merge updates (shallow merge, null values delete keys)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        delete current[key];
      } else {
        current[key] = value;
      }
    }

    // Save back
    await runtime.env.DB
      .prepare('UPDATE users SET metadata = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(current), Math.floor(Date.now() / 1000), auth.userId)
      .run();

    return new Response(
      JSON.stringify(current),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update preferences error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update preferences' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
