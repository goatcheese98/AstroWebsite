/**
 * Better Auth API Handler - Catch-All Route
 * File: src/pages/api/auth/[...all].ts
 *
 * This catch-all route handles ALL Better Auth requests at /api/auth/*
 * Better Auth internally routes to the correct handler based on the path.
 *
 * Supported routes (handled internally by Better Auth):
 * - POST /api/auth/sign-up/email - Register with email/password
 * - POST /api/auth/sign-in/email - Login with email/password
 * - POST /api/auth/sign-out - Logout
 * - GET  /api/auth/session - Get current session
 * - OAuth routes for Google, GitHub, etc.
 *
 * Based on Better Auth official Astro integration:
 * https://www.better-auth.com/docs/integrations/astro
 */

import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';

// Disable static pre-rendering (required for auth)
export const prerender = false;

/**
 * Handle all HTTP methods (GET, POST, PUT, DELETE, etc.)
 * This is called for every request to /api/auth/*
 */
export const ALL: APIRoute = async (ctx) => {
  try {
    // Access Cloudflare runtime and environment
    const runtime = ctx.locals.runtime;

    // Validate runtime is available
    if (!runtime?.env) {
      console.error('[Better Auth] Runtime not configured');
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

    // Validate D1 database binding exists
    if (!runtime.env.DB) {
      console.error('[Better Auth] D1 database binding missing');
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'D1 database binding is missing. Check wrangler.jsonc.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Better Auth instance with D1 database and environment
    // Note: We create this per-request because D1 binding is only available at runtime
    const auth = createAuth(runtime.env.DB, {
      BETTER_AUTH_SECRET: runtime.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: runtime.env.BETTER_AUTH_URL,
      GOOGLE_CLIENT_ID: runtime.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: runtime.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: runtime.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: runtime.env.GITHUB_CLIENT_SECRET,
    });

    // Pass the request directly to Better Auth handler
    // Better Auth will handle the routing internally based on the path
    // For example: /api/auth/sign-up/email will be routed to the signup handler
    return await auth.handler(ctx.request);
  } catch (error) {
    console.error('[Better Auth] Handler error:', error);

    return new Response(
      JSON.stringify({
        error: 'Authentication error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
