/**
 * Better Auth API Handler - Catch-All Route
 * File: src/pages/api/auth/[...all].ts
 */

import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';

// Disable static pre-rendering (required for auth)
export const prerender = false;

/**
 * Get environment variables from various sources
 * - runtime.env (production / wrangler)
 * - import.meta.env (vite dev mode)
 * - process.env (node fallback)
 */
function getEnv(runtime: any): {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
} {
  // Priority 1: runtime.env (Cloudflare production)
  if (runtime?.env?.BETTER_AUTH_SECRET) {
    return {
      BETTER_AUTH_SECRET: runtime.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: runtime.env.BETTER_AUTH_URL || 'http://localhost:4321',
      GOOGLE_CLIENT_ID: runtime.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: runtime.env.GOOGLE_CLIENT_SECRET,
    };
  }

  // Priority 2: import.meta.env (Vite dev mode)
  const viteEnv = import.meta.env;
  if (viteEnv?.BETTER_AUTH_SECRET) {
    return {
      BETTER_AUTH_SECRET: viteEnv.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: viteEnv.BETTER_AUTH_URL || 'http://localhost:4321',
      GOOGLE_CLIENT_ID: viteEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: viteEnv.GOOGLE_CLIENT_SECRET,
    };
  }

  // Priority 3: process.env (Node fallback)
  return {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:4321',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
}

export const ALL: APIRoute = async (ctx) => {
  try {
    const runtime = ctx.locals.runtime;
    const env = getEnv(runtime);

    console.log('[Better Auth] Environment check:', {
      hasDB: !!runtime?.env?.DB,
      hasAuthSecret: !!env.BETTER_AUTH_SECRET,
      hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      authUrl: env.BETTER_AUTH_URL,
    });

    // Validate database
    if (!runtime?.env?.DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          details: 'D1 database binding is missing. Run: wrangler d1 migrations apply astroweb-db --local',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required env vars
    if (!env.BETTER_AUTH_SECRET) {
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          details: 'BETTER_AUTH_SECRET is not set. Check your .env file.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create auth instance
    const auth = createAuth(runtime.env.DB, env);

    // Handle request
    return await auth.handler(ctx.request);
  } catch (error) {
    console.error('[Better Auth] Handler error:', error);

    return new Response(
      JSON.stringify({
        error: 'Authentication error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
