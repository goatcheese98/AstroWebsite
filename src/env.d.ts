/// <reference types="astro/client" />
/// <reference types="@clerk/astro/env" />

// Cloudflare Runtime Types
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    // Add any custom locals here if needed
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

  // Clerk Secrets (optional for types, but used by Clerk internally)
  CLERK_SECRET_KEY?: string;
  PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
}

