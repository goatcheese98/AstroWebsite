/**
 * Database Health Check Endpoint
 * Test endpoint to verify D1 database connection
 * GET /api/db-health
 */

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const runtime = locals.runtime;

    // Check if runtime exists
    if (!runtime || !runtime.env) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Cloudflare runtime not available',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if D1 binding exists
    if (!runtime.env.DB) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'D1 database binding not configured',
          hint: 'Make sure DB binding is set in wrangler.jsonc',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Test database connection with a simple query
    const db = runtime.env.DB;
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();

    // Check for required tables
    const tables = result.results?.map((r: any) => r.name) || [];
    const requiredTables = [
      'users',
      'sessions',
      'accounts',
      'verification_tokens',
      'canvases',
      'canvas_versions',
      'canvas_shares',
    ];

    const missingTables = requiredTables.filter((t) => !tables.includes(t));

    // Get row counts for each table
    const tableCounts: Record<string, number> = {};
    for (const table of requiredTables) {
      if (tables.includes(table)) {
        const count = await db
          .prepare(`SELECT COUNT(*) as count FROM ${table}`)
          .first<{ count: number }>();
        tableCounts[table] = count?.count || 0;
      }
    }

    // Check KV bindings
    const kvStatus = {
      SESSION_KV: !!runtime.env.SESSION_KV,
      RATE_LIMIT_KV: !!runtime.env.RATE_LIMIT_KV,
    };

    // Check R2 binding
    const r2Status = {
      CANVAS_STORAGE: !!runtime.env.CANVAS_STORAGE,
    };

    // Check environment variables
    const envStatus = {
      BETTER_AUTH_SECRET: !!runtime.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: !!runtime.env.BETTER_AUTH_URL,
      ANTHROPIC_API_KEY: !!runtime.env.ANTHROPIC_API_KEY,
      GOOGLE_GEMINI_API_KEY: !!runtime.env.GOOGLE_GEMINI_API_KEY,
      GOOGLE_CLIENT_ID: !!runtime.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!runtime.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: !!runtime.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: !!runtime.env.GITHUB_CLIENT_SECRET,
    };

    // Overall health status
    const isHealthy =
      missingTables.length === 0 &&
      kvStatus.SESSION_KV &&
      kvStatus.RATE_LIMIT_KV &&
      !!runtime.env.BETTER_AUTH_SECRET;

    return new Response(
      JSON.stringify({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          tables: {
            found: tables,
            missing: missingTables,
            counts: tableCounts,
          },
        },
        bindings: {
          kv: kvStatus,
          r2: r2Status,
        },
        environment: envStatus,
        warnings: [
          ...(!runtime.env.BETTER_AUTH_SECRET
            ? ['BETTER_AUTH_SECRET not set - using fallback (insecure)']
            : []),
          ...(!runtime.env.ANTHROPIC_API_KEY ? ['ANTHROPIC_API_KEY not set'] : []),
          ...(!runtime.env.GOOGLE_GEMINI_API_KEY ? ['GOOGLE_GEMINI_API_KEY not set'] : []),
          ...(!runtime.env.GOOGLE_CLIENT_ID || !runtime.env.GOOGLE_CLIENT_SECRET
            ? ['Google OAuth not configured']
            : []),
          ...(!runtime.env.GITHUB_CLIENT_ID || !runtime.env.GITHUB_CLIENT_SECRET
            ? ['GitHub OAuth not configured']
            : []),
          ...(!r2Status.CANVAS_STORAGE ? ['R2 CANVAS_STORAGE not configured'] : []),
          ...(missingTables.length > 0
            ? [`Missing database tables: ${missingTables.join(', ')}`]
            : []),
        ],
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Database health check failed:', error);

    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Database health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
