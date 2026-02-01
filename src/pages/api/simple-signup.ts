/**
 * Simple signup endpoint (no Better Auth)
 * Just creates a user directly in the database for testing
 */

import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime;

    if (!runtime?.env?.DB) {
      return new Response(JSON.stringify({
        error: 'Database not available',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, email, password } = body;

    console.log('Simple signup request:', { name, email });

    // Create user directly in database (for testing only - no password hashing!)
    const userId = nanoid();
    const now = Math.floor(Date.now() / 1000);

    const result = await runtime.env.DB
      .prepare(
        'INSERT INTO users (id, email, name, email_verified, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
      )
      .bind(userId, email, name, now, now)
      .run();

    console.log('User created:', result);

    return new Response(JSON.stringify({
      success: true,
      userId,
      message: 'User created (test mode - no real auth)',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Simple signup error:', error);

    return new Response(JSON.stringify({
      error: 'Signup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
