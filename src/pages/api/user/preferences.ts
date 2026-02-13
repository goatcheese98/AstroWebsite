/**
 * User Preferences API
 * GET /api/user/preferences — returns user.unsafeMetadata.preferences JSON
 * PATCH /api/user/preferences — merges new preferences into user.unsafeMetadata.preferences
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const auth = await requireAuth(context);
    if (!auth.authenticated) return auth.response;

    const user = await clerkClient(context).users.getUser(auth.userId);
    const preferences = (user.unsafeMetadata?.preferences as Record<string, any>) || {};

    return new Response(
      JSON.stringify(preferences),
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

    const client = clerkClient(context);
    const user = await client.users.getUser(auth.userId);
    const current = (user.unsafeMetadata?.preferences as Record<string, any>) || {};

    // Merge updates (shallow merge, null values delete keys)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        delete current[key];
      } else {
        current[key] = value;
      }
    }

    // Save back to Clerk
    await client.users.updateUser(auth.userId, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        preferences: current,
      },
    });

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
