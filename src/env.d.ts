/// <reference types="astro/client" />

// Cloudflare Runtime Types
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    // Better Auth session data (will be populated by auth middleware)
    session?: {
      user: {
        id: string;
        email: string;
        name?: string;
        avatar_url?: string;
      };
      sessionId: string;
    };
  }
}

// Cloudflare Bindings
interface Env {
  // D1 Database
  DB: import('@cloudflare/workers-types').D1Database;

  // KV Namespaces
  SESSION_KV: import('@cloudflare/workers-types').KVNamespace;
  RATE_LIMIT_KV: import('@cloudflare/workers-types').KVNamespace;

  // R2 Bucket
  CANVAS_STORAGE: import('@cloudflare/workers-types').R2Bucket;

  // API Keys (already defined in .env)
  ANTHROPIC_API_KEY: string;
  MOONSHOT_API_KEY: string;
  GOOGLE_GEMINI_API_KEY: string;

  // Auth settings (optional)
  ENABLE_API_AUTH?: string;
  API_SECRET_KEY?: string;

  // Better Auth secrets
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;

  // OAuth credentials (optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

