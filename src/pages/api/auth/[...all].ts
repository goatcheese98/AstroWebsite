/**
 * Better Auth API Handler
 * Handles all authentication routes: /api/auth/*
 *
 * Routes handled by Better Auth:
 * - POST /api/auth/sign-up - Register new user
 * - POST /api/auth/sign-in/email - Email/password login
 * - POST /api/auth/sign-out - Logout
 * - POST /api/auth/verify-email - Verify email
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password - Reset password
 * - GET  /api/auth/session - Get current session
 * - OAuth routes for Google, GitHub, etc.
 */

import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';

// Disable prerendering for auth routes
export const prerender = false;

// Handle all HTTP methods
export const ALL: APIRoute = async ({ request, locals }) => {
  try {
    // Get D1 database from Cloudflare runtime
    const runtime = locals.runtime;

    if (!runtime || !runtime.env.DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'D1 database binding is missing',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create auth instance with D1 database
    const auth = createAuth(runtime.env.DB);

    // Let Better Auth handle the request
    return auth.handler(request);
  } catch (error) {
    console.error('Auth API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Authentication error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
