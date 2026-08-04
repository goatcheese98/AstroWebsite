# Canvas App Separation Vision

## Purpose
This document captures the current direction for separating the AI canvas product from the Astro portfolio site.

It is intentionally not a rigid migration spec. The goal is to preserve the architectural idea clearly while leaving room to diagnose existing coupling, adjust boundaries, and make better decisions as the migration unfolds.

## Core Idea
The AI canvas should become an independent application with its own codebase, runtime concerns, and product surface area.

That independent application would own:
- the canvas experience
- AI chat and assistant workflows
- authentication
- dashboard and saved-canvas management
- app routing and app-specific state
- plugin orchestration for independently evolving feature surfaces

The Astro site would remain the portfolio and marketing surface.

That means Astro would no longer be responsible for:
- canvas runtime behavior
- app authentication
- dashboard UX
- product-specific frontend orchestration

## Product Boundary
The intended boundary is between:

`Portfolio site`
- personal website
- project pages
- blog/content
- branding and presentation

and

`Canvas app`
- interactive product
- signed-in user experience
- persistence and collaboration workflows
- assistant-powered creation flows

This is not just a refactor for code organization. It is a clarification that these are effectively two different applications with different responsibilities.

## URL / Access Model
The current direction is to keep the canvas app accessible through its own app-oriented surface rather than as an Astro island.

The existing subdomain approach, such as `canvas.rohanjasani.com`, already points in the right direction:
- the portfolio remains at the main site
- the canvas app remains accessible under its own URL
- the public URL can stay stable even if the implementation underneath changes

Astro may still link to the app, reference it, or present it as part of the broader portfolio, but the app itself should not need to live inside Astro's island architecture.

## Architectural Intent
The main architectural shift is:

From:
- Astro as both portfolio shell and canvas application host

To:
- Astro as portfolio site
- React app as standalone product application
- shell-oriented product architecture with room for independently bounded feature codebases

This would allow the canvas app to evolve independently without repeatedly introducing complexity, risk, or product-specific infrastructure into the portfolio codebase.

## Internal App Direction
Inside the standalone React app, the emerging direction is not a single ever-growing frontend codebase.

Instead, the app may evolve toward:
- a shell or orchestrator layer
- multiple independently bounded feature codebases or plugins
- explicit communication contracts between shell and features

Examples of feature areas that may eventually become independently developed units:
- Markdown / Lexical notes
- Kanban
- Web embeds
- Prototype tools
- other future experimental canvas features

In this direction, the shell would remain responsible for the product-level concerns that should stay centralized:
- AI orchestration
- canvas-level coordination
- auth/session ownership
- persistence contracts
- shared lifecycle and embedding rules
- error containment and feature registration

This direction is motivated not only by separation of concerns, but also by the expectation that many more plugins or feature surfaces may be added over time.

## Why This Direction Makes Sense
Several concerns inside the current canvas experience behave more like full application concerns than portfolio-page concerns:
- authentication
- dashboard and saved work
- assistant and generation workflows
- collaboration
- app-level state and persistence

At the same time, several canvas features behave less like small components and more like mini products with their own editing models, dependencies, and iteration cycles.

Keeping those concerns inside Astro makes the portfolio repo responsible for product behavior that is conceptually separate from the website itself.

Separating them should improve:
- codebase clarity
- deploy clarity
- ownership boundaries
- confidence when changing the portfolio site
- confidence when changing the canvas product
- long-term scalability as more plugins are introduced
- AI-assisted development by keeping implementation scope smaller and more explicit

## Desired Outcomes
The desired outcome is not simply "move files elsewhere."

The broader outcome is:
- the canvas app can be developed and deployed with minimal impact on the portfolio site
- the portfolio site can evolve without concern for canvas-specific regressions
- auth and dashboard concerns are contained within the app that actually uses them
- the canvas product can eventually adopt its own conventions, routing, and backend boundaries without needing to conform to Astro page assumptions
- future feature plugins can be prototyped, replaced, or isolated without forcing all complexity into one application surface
- the shell can remain stable even while individual feature areas evolve quickly

## What This Is Not
This idea does not yet assume:
- a final folder structure
- a final deployment topology
- a final backend split
- a final authentication transport strategy across services
- a final list of files that must move unchanged
- a final plugin protocol
- that every feature should become an independent codebase immediately
- that all internal boundaries should be solved before the first extraction

Those details should be discovered and validated during the migration.

## Working Principles During Migration
As we move through the migration, the following principles should guide decisions:

### 1. Preserve a clean product boundary
If a feature exists only to support the canvas product, it likely belongs with the app rather than the portfolio site.

### 2. Avoid recreating hidden coupling
A move is less valuable if the new React app still depends heavily on Astro-specific assumptions, pathing, or runtime behavior.

### 3. Keep public access stable where possible
If `canvas.rohanjasani.com` remains the public entry point, the implementation can change behind the scenes without changing the product's identity.

### 4. Favor diagnosable seams over perfect upfront design
It is acceptable to use temporary adapters or transitional boundaries if they make the migration safer and easier to understand.

### 5. Treat this as application separation, not just component extraction
The migration should respect the fact that auth, dashboard, and canvas workflows belong to the same product surface.

### 6. Let the architecture be proven by feature extraction
The target architecture should be validated by extracting and embedding bounded feature areas first, rather than assuming the final internal shape upfront.

### 7. Prefer stable shell contracts over shared implicit behavior
If many feature codebases are introduced, scalability will depend more on a disciplined shell contract than on keeping everything in one repo or one runtime.

### 8. Optimize for manageable AI context
Smaller bounded codebases may be preferable when AI is a major implementation collaborator, as long as boundaries are explicit and integration rules are stable.

## Likely Areas of Investigation
These areas will need diagnosis as the migration proceeds:
- frontend dependencies that still assume Astro routing or Astro runtime APIs
- auth flows and how they should be owned by the standalone app
- dashboard and save flows that currently rely on Astro-hosted endpoints
- app-specific state, persistence, and collaboration concerns
- what backend responsibilities should remain shared, be proxied, or move entirely out of Astro
- deployment and environment configuration for the standalone app
- which feature areas are good first candidates for extraction
- what shell-to-feature contract is needed for embedding, persistence, commands, and failure isolation
- which dependencies should remain shell-owned versus feature-local

## Incremental Migration Mindset
The migration does not need to be framed as a single cutover from day one.

It is reasonable to:
- establish the standalone app direction without forcing a full cutover immediately
- validate the architecture by extracting one or more bounded features first
- use those extractions to learn the right shell/plugin boundaries
- migrate product-owned frontend concerns into the eventual standalone boundary
- keep some transitional backend contracts in place temporarily
- tighten the separation as real coupling becomes visible

The important thing is that each step should move the system toward a clearer division between:
- the portfolio website
- the canvas product application

A likely interpretation of this mindset is:
- do not force the entire application out of Astro as the very first move if a smaller feature extraction can teach the architecture more safely
- use the first extracted feature as a proving ground for future plugin patterns
- allow the larger app separation to be informed by real integration lessons rather than theory alone

## Summary
The vision is for AstroWeb to stop acting as the long-term host for the AI canvas product.

Instead:
- Astro remains the portfolio site
- the canvas, auth, dashboard, and assistant experience become an independent React application
- that application may itself evolve into a shell with independently bounded feature surfaces
- the app remains accessible through its own stable app-facing URL
- migration decisions remain flexible until the real technical seams are fully understood
- early migrations should favor proving the feature-boundary model before committing to a fully prescriptive end state
