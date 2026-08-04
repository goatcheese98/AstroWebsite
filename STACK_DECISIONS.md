# Stack Decisions — Standalone Canvas Application

This document captures the architectural decisions for the standalone rebuild of the AI Canvas application. Each choice is justified against the core principles: **simplicity, minimal boilerplate, testability, and performance**. Where trade-offs exist, they are named explicitly.

---

## Core Principles

Before the stack, the principles. Every decision below is evaluated against these:

- **Simplicity first.** Fewer moving parts. If two solutions solve the same problem, pick the one with less ceremony.
- **Minimal boilerplate.** Framework-specific glue code should not dominate the codebase. Data fetching, routing, auth, and API design should feel native.
- **Battle-tested patterns.** The reference codebase has proven patterns — the canvas overlay system, the collaboration hook, the AI service layer. Port them faithfully. Do not redesign what already works.
- **Testable by default.** Business logic, data transforms, and utilities should be unit testable without a browser or a running server.
- **Performance as a constraint.** The application is canvas-first and client-heavy. Fast initial load, minimal re-renders, and efficient real-time sync are non-negotiable.

---

## Stack at a Glance

| Concern | Choice |
|---|---|
| Framework | TanStack Start |
| Router | TanStack Router |
| Data Fetching | TanStack Query |
| State | Zustand |
| Canvas | Excalidraw |
| Rich Text | Lexical |
| Database | Turso (LibSQL) |
| ORM | Drizzle |
| Storage | Cloudflare R2 |
| Auth | Clerk |
| Real-time | PartyKit |
| AI | Anthropic SDK |
| Styling | Tailwind CSS v4 |
| Testing | Vitest |
| Deploy | Cloudflare Pages (via Nitro) |

---

## Decision Breakdown

### Framework: TanStack Start

The reference application is built on Astro with React islands. Astro's island architecture forces cross-component communication through CustomEvents (`canvas:data-change`, `canvas:kanban-update`, etc.) because islands are isolated React trees that cannot share state directly. This is the single largest source of accidental complexity in the current codebase.

TanStack Start eliminates this entirely. The application becomes one React tree. Excalidraw, Lexical, the Kanban board, and the AI chat panel can share state through React Context or Zustand without any event bus. The overlay positioning system, the collaboration hook, and the AI service layer port directly.

TanStack Start is also framework-agnostic at the deployment layer — it runs on any runtime that Nitro supports. This matters for long-term flexibility.

**What we gain:** Elimination of the islands/CustomEvent pattern, unified React tree, type-safe server functions via `createServerFn`.

**Risk to acknowledge:** TanStack Start reached v1 recently. The Cloudflare Pages deployment via the Nitro preset is functional but has less community mileage than more established frameworks on the same target. Expect to encounter edge cases during deployment that require digging through sparse documentation.

---

### Router: TanStack Router

TanStack Router is the best TypeScript router available today. Route params, search params, and navigation are fully type-safe end-to-end — not inferred after the fact, but structurally enforced. File-based routing keeps the structure predictable and navigable.

This is the natural companion to TanStack Start and requires no additional configuration to integrate.

---

### Data Fetching: TanStack Query

TanStack Query handles caching, deduplication, background refresh, and optimistic updates. For the dashboard canvas list, canvas metadata, and version history — all of which benefit from caching — this replaces the manual cache patterns currently implemented with Cloudflare KV.

Importantly, TanStack Query's aggressive caching directly reduces the number of database round-trips, which partially offsets any database read latency concerns regardless of which database is chosen.

---

### State: Zustand

The reference codebase uses Zustand in places. It is a direct port — minimal API, no boilerplate, no provider wrapping. For canvas-local state that does not need to survive a route change, component state is sufficient. For state shared across the canvas, overlays, and the AI panel, Zustand is the right scope.

---

### Canvas: Excalidraw

Direct port. No changes to the core canvas integration. The overlay architecture — how Lexical, Markdown, and Kanban elements are positioned and rendered on top of the Excalidraw canvas — is preserved exactly.

---

### Rich Text: Lexical

Direct port. The Lexical node implementations, the image handling, and the persistence layer are carried over unchanged.

---

### Database: Turso (LibSQL)

This decision deserves the most elaboration because the alternative — Cloudflare D1 — is a reasonable choice and the simpler option on the surface.

**Why not D1**

D1 is Cloudflare's native SQLite database. It integrates seamlessly within the Cloudflare ecosystem (no separate account, no separate API keys, same billing dashboard as Pages and R2). For most workloads it is excellent.

The limitations relevant to this application:

1. **Write latency.** D1 uses a single-primary model. Every write — canvas saves, metadata updates, version records — must travel to wherever Cloudflare has placed the primary node. For users geographically distant from that node, this latency is real and accumulates with frequent auto-save operations.

2. **Vendor lock-in.** D1 is strictly bound to Cloudflare Workers and Pages. A standalone application that is rebuilt to be portable should not have its database locked to a single deployment platform. If the application ever moves to a different host, D1 cannot come with it.

**Why Turso**

Turso is built on LibSQL, an open-source fork of SQLite. The schema from D1 migrates verbatim — same SQL dialect, same Drizzle driver swap. The operational differences are meaningful:

- **Edge replicas.** Turso places read replicas close to your users globally. A user in Tokyo queries a Tokyo replica. A user in London queries a London replica. Read latency is consistently low regardless of where the user is located.
- **Database branching.** Turso treats a database like a Git repository. A branch is an instant copy of the database with all production data. Schema migrations, AI context schema changes, and structural experiments can be validated against real data without touching production. This is a material workflow improvement for rapid iteration.
- **Portability.** Turso does not care where the application is deployed. Cloudflare Pages today, a VPS tomorrow — the database connection string does not change.

**The honest calibration**

The performance case for Turso is sometimes overstated. In this specific application, the heavy canvas data (the JSON blob) lives in R2, not D1. D1 primarily stores metadata — canvas name, timestamps, version numbers, user records. These are small reads, and TanStack Query caches them aggressively, further reducing actual database round-trips. The difference in read latency between D1 and Turso replicas is real but less dramatic for this access pattern than it would be for a read-heavy data application.

The two strongest arguments for Turso in this context are **portability** and **branching** — not raw edge performance. A standalone application that is meant to be independent of any single platform should have a database that reflects that independence.

**Trade-off to name explicitly:** Turso introduces a second vendor. A separate account, separate usage monitoring, and an authentication handshake between the Cloudflare-deployed frontend and the Turso network. This is real operational overhead. It is the honest cost of the portability and branching benefits.

---

### ORM: Drizzle

The reference codebase defines a Drizzle schema but bypasses it with raw SQL for actual queries. This inconsistency is corrected in the rebuild — Drizzle is used consistently throughout. The schema migrates from D1 to Turso with only a driver swap. No data model changes required.

Drizzle's type inference keeps query results typed without code generation steps.

---

### Storage: Cloudflare R2

R2 stores canvas JSON blobs and thumbnails. It is S3-compatible, has no egress fees, and integrates naturally with Cloudflare Pages. This is unchanged from the reference application and is the right choice regardless of which database is used.

---

### Auth: Clerk

The reference application uses Better Auth with a hand-rolled middleware layer. `requireAuth()` is implemented manually, session handling is custom, and the auth tables are managed alongside application tables.

Clerk replaces all of this. `clerkMiddleware()` in one line, `auth()` in server functions and server components, and Google OAuth configured through a dashboard rather than in code. The auth flow in the application — sign in, sign out, protected routes — is preserved in terms of user experience. The implementation is dramatically simpler.

**Trade-off to name explicitly:** Clerk is a paid external service. Better Auth is open-source and self-hosted — no ongoing cost, no dependency on a third-party vendor for authentication. The decision to use Clerk is a conscious trade of vendor dependency for developer experience. If cost or vendor independence is a priority, Better Auth with a cleaner integration pattern is a viable alternative.

---

### Real-time: PartyKit

Unchanged. PartyKit is framework-agnostic and handles the canvas collaboration protocol independently of the web framework. The `useCollaboration` hook ports directly. The encryption model, the reconciliation logic, and the cursor sync all carry over without modification.

---

### AI: Anthropic SDK

Direct port of the service layer. The expert routing system, the artifact extraction logic, and the streaming response handling are carried over as-is. The AI chat panel and its integration with canvas state port directly once the CustomEvent dependency is replaced with shared React state.

---

### Styling: Tailwind CSS v4

Consistent with the reference application. Tailwind v4's performance improvements and simplified configuration reduce build overhead. No design system changes — the visual language of the dashboard and canvas UI is preserved.

---

### Testing: Vitest

Colocated with source files. Business logic (image resize math, canvas persistence transforms, AI artifact extraction, kanban operation application) is unit tested without a browser or a running server. The reference codebase already has test files colocated — this pattern is continued and extended.

---

### Deploy: Cloudflare Pages via Nitro

TanStack Start uses Nitro as its server engine. The Cloudflare Pages preset compiles the application to a format that runs on Cloudflare's edge network. R2 bindings, KV bindings, and environment variables are configured through the Cloudflare dashboard as usual.

**Risk to acknowledge:** This is the least battle-tested part of the stack. The Nitro Cloudflare Pages preset for TanStack Start has less community mileage than Remix's dedicated Cloudflare adapter. Budget time for deployment-specific troubleshooting, particularly around runtime bindings and edge function constraints.

---

## What Changes vs. What Stays

### Eliminated from the reference codebase

- The islands architecture and its CustomEvent communication bus (`canvas:data-change`, `canvas:kanban-update`, `canvas:load-state`)
- Framework-specific adapter code that exists only to bridge Astro's constraints
- The dual raw SQL + Drizzle pattern — Drizzle is used consistently throughout
- Hand-rolled auth middleware — replaced by Clerk

### Ported directly

- The canvas overlay system (how Lexical, Markdown, and Kanban elements are positioned on top of Excalidraw)
- The `useCollaboration` hook and PartyKit protocol
- The AI service layer, expert routing, and artifact extraction
- The Lexical node implementations and image handling
- The Zustand stores
- The visual design and interaction patterns of the dashboard and canvas UI
- The Drizzle schema (driver swap only)
- Colocated test files

### Improved in the rebuild

- Cross-component state flows through React Context or Zustand instead of CustomEvents
- Auth is handled by Clerk with no custom middleware
- Database is consistently accessed through Drizzle
- TanStack Query replaces manual KV caching for application data
