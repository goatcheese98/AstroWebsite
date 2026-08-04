# Legacy Canvas retirement

**Status:** Retired from AstroWeb on August 3, 2026

**Replacement:** RoopStudio in the separate `goatcheese98/AICanvas` repository

**Public product:** <https://canvas.rohanjasani.com/>

## What moved

RoopStudio now owns the visual workspace, dashboard, authentication, Canvas APIs, and product deployment. AstroWeb is once again responsible only for the public portfolio and notes.

The old `/canvas`, `/ai-canvas`, `/dashboard`, `/login`, and `/signup` URLs permanently redirect to their RoopStudio equivalents so old links remain useful.

## What was retired here

- The Canvas-only Cloudflare deployment workflow and Wrangler target
- Canvas D1, KV, R2, and migration bindings from the portfolio deployment
- Canvas build/preview/deploy scripts
- Legacy Canvas, assistant, user, image-generation, and database-health API routes
- Portfolio-wide Clerk middleware and Astro integration
- Canvas-specific theme and navigation behavior
- The remaining Canvas components, editors, collaboration server, assistant backend, database layer, storage utilities, tests, generated assets, and dedicated dependencies

The retired implementation remains available in Git history. AstroWeb now contains only the portfolio-facing product link and permanent redirects to RoopStudio.
