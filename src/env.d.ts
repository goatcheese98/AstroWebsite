/// <reference types="astro/client" />

// Cloudflare Runtime Types
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    // Add any custom locals here if needed
  }
}

// Cloudflare Bindings
interface Env {}
