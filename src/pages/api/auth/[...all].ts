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
    // Get Cloudflare runtime and environment
    const runtime = locals.runtime;

    if (!runtime || !runtime.env) {
      return new Response(
        JSON.stringify({
          error: 'Runtime not configured',
          details: 'Cloudflare runtime is missing',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!runtime.env.DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'D1 database binding is missing. Make sure wrangler.jsonc has DB binding configured.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create auth instance with D1 database and environment variables
    const auth = createAuth(runtime.env.DB, {
      BETTER_AUTH_SECRET: runtime.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: runtime.env.BETTER_AUTH_URL,
      GOOGLE_CLIENT_ID: runtime.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: runtime.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: runtime.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: runtime.env.GITHUB_CLIENT_SECRET,
    });

    // Let Better Auth handle the request
    return auth.handler(request);
  } catch (error) {
    console.error('Auth API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Authentication error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
