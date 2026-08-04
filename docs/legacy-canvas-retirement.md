# Legacy Canvas retirement

**Status:** Retired from AstroWeb on August 3, 2026

**Replacement:** RoopStudio in the separate `goatcheese98/AICanvas` repository

**Public product:** <https://canvas.rohanjasani.com/>

## What moved

RoopStudio now owns the visual workspace, dashboard, authentication, Canvas APIs, and product deployment. AstroWeb is once again responsible only for the public portfolio and notes.

The old `/canvas`, `/ai-canvas`, `/dashboard`, `/login`, and `/signup` URLs permanently redirect to their RoopStudio equivalents so old links remain useful.

## What was retired here

- The Canvas-only Cloudflare deployment workflow and Wrangler target
- Canvas build/preview/deploy scripts
- Legacy Canvas, assistant, user, image-generation, and database-health API routes
- Portfolio-wide Clerk middleware and Astro integration
- Canvas-specific theme and navigation behavior

## Source archive boundary

Legacy Canvas components and supporting libraries remain under `src/` temporarily as a source archive. There is uncommitted `new-lex` editor work in this checkout, so moving or deleting that tree would risk losing work. None of this source is reachable from a public Astro route or included as a homepage client island.

After the uncommitted editor work has been reconciled with RoopStudio, the remaining legacy component/library tree and its dedicated dependencies can be removed in one clean follow-up.
