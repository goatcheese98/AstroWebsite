# Spec: Portfolio Reboot for an AI-Native Product and Systems Operator

## Assumptions

1. The primary audience is hiring managers and founders evaluating Rohan for applied AI, AI product, forward-deployed, solutions, automation, and technical product roles in Canada.
2. The portfolio should be understandable to a business leader first, while offering enough technical depth to satisfy an engineering or product reviewer.
3. Rohan's strongest current proof is his work at Level Up Mortgages on `lum-brain`, followed by RoopStudio, Promptfolio, analytics projects, and prior regulated-operations experience.
4. `lum-brain` is a private team repository. Rohan's `goatcheese98` account has write-level collaborator access, but public GitHub metadata does not attribute commits to that account. The site will describe Rohan's role and contribution without presenting the repository as a solo project or linking recruiters to a page they cannot open.
5. "Production" means the completed reboot will be built, tested, committed, pushed, deployed through the repository's existing Cloudflare Pages workflow, and checked at the live domain.
6. Existing unrelated worktree changes belong to the user and must remain untouched.

## Objective

Reposition `rohanjasani.com` from a general analytics-student portfolio into a credible, case-study-led portfolio for a business-trained, AI-native product and systems operator.

The site should communicate one durable idea within the first viewport:

> Rohan finds expensive operational friction, turns it into reliable AI-enabled systems, introduces those systems into the organization, and stays accountable for whether they work.

The site should make four qualities legible:

- Business judgment: problem selection, workflow discovery, and translation across operators, leaders, and technology.
- Hands-on delivery: prototyping, integrations, testing, deployment, and iteration.
- Responsible operation: human approvals, auditability, failure handling, and maintenance.
- Organizational leadership: internal consultation, training, adoption, documentation, and feedback loops.

## Positioning

### Primary identity

**AI Product & Systems Builder**

Supporting descriptor:

**Business-trained. AI-native. Accountable from workflow discovery to adoption and operation.**

### Core message

**I turn operational friction into AI systems teams actually use.**

### Proof hierarchy

1. Level Up Mortgages: a production operations and internal-assistance system spanning CRM, email, documents, meetings, planning, rates, approvals, and internal decision support.
2. RoopStudio: an AI-native visual workspace that demonstrates product construction and structured model interaction.
3. Promptfolio: prompt management and evaluation focused on repeatability and learning loops.
4. Analytics work: ALGS performance, Methanex job taxonomy, Vancouver restaurant analysis, and portfolio optimization.
5. Goldman Sachs and Megaplex: regulated operations, analytical rigor, structured data, and stakeholder execution.

### Role targets

- Applied AI Engineer / AI Product Engineer / AI Systems Engineer
- AI Solutions Engineer / Forward Deployed Engineer / Implementation Engineer
- AI Automation Engineer / Business Systems Builder
- Technical Product or AI Operations roles with substantial hands-on building

## Information Architecture

### 1. Navigation

- Rohan Jasani wordmark
- Work
- Experience
- Approach
- Notes
- Contact
- One restrained availability indicator

Public portfolio navigation must not show authentication or dashboard controls. Product surfaces such as RoopStudio remain accessible from their case-study links rather than competing with the portfolio's primary story.

### 2. Hero

- Eyebrow: `AI PRODUCT & SYSTEMS BUILDER · VANCOUVER`
- Headline: `I turn operational friction into AI systems teams actually use.`
- Short supporting paragraph explaining the business-to-system-to-adoption loop.
- Primary CTA: `See the Level Up case study`
- Secondary CTA: `View selected work`
- Compact proof strip with:
  - Production AI operations platform
  - Cross-platform workflow integrations
  - Human approvals and audit controls
  - Team training and adoption

Remove the rotating-title typewriter. It makes the identity feel unresolved and hides the strongest positioning behind animation.

### 3. Signature case study: Level Up Mortgages

Present this as a professional engagement and team system, not a personal side project.

Required story:

- Context: a Vancouver mortgage brokerage operating across fragmented tools and high-stakes client workflows.
- Role: led/co-led discovery, design, rollout, internal consultation, training, and continuous improvement while contributing hands-on to the production system.
- System: one operations layer spanning Gmail, Zoho CRM, Finmo, Fathom, Google Workspace, Slack, Asana, Dropbox, and mortgage-specific decision workflows.
- Selected capabilities: email triage and drafting, client-document filing, meeting follow-up, rate/lender decision support, planning, approvals, and internal dashboards.
- Trust model: schema-grounded outputs, human approval gates, audit trails, idempotent actions, tests, monitoring, and reversible operations.
- Adoption: documentation, team enablement, feedback collection, and workflow iteration.
- Technical detail: TypeScript, Hono, Cloudflare Workers, D1, KV, R2, Queues, Workflows, Zod, Vitest, and Bun, placed after the business explanation.

Claims must use collaborative language where ownership is shared. Do not imply sole authorship of the private repository.

### 4. Operating approach

Show the complete loop as a five-step sequence:

1. Discover the costly friction.
2. Design the workflow and decision boundaries.
3. Build the smallest useful system.
4. De-risk it with approvals, tests, and observable operations.
5. Enable the team, measure adoption, and keep improving it.

This section should articulate Rohan's moat without using defensive language about being "non-technical."

### 5. Selected work

Use a prioritized editorial layout rather than a carousel. Every project must be visible and scannable without interaction.

- RoopStudio: featured product case study with live product link.
- Promptfolio: AI evaluation and prompt operations.
- Methanex Job Taxonomy and Career Path Analysis: structured data, embeddings, clustering, and decision storytelling.
- ALGS Esports Performance Dashboard: data pipeline and audience-facing analytics.

Optional smaller links may include the Vancouver restaurant analysis and portfolio optimization project.

### 6. Experience and education

Use a chronological, readable timeline:

- Level Up Mortgages, AI Automation & Operations Associate / AI Product & Systems scope, 2026 to present.
- UBC Sauder School of Business, Master of Business Analytics, expected August 2026.
- Goldman Sachs, Consumer Wealth Management Analyst, 2022 to 2023.
- Larry H. Miller Megaplex Theatres, Data Analytics Intern, 2022.

The Level Up entry must foreground product leadership, internal consultation, training, adoption, and end-to-end delivery. Technical stack names should support the story rather than dominate it.

### 7. Notes and contact

- Keep the blog available as evidence of thought process.
- End with a direct invitation for applied AI, forward-deployed, solutions, and product-systems work.
- Provide email, LinkedIn, and GitHub links.
- Do not publish the phone number.

## Visual Direction

### Concept

An **operator's field dossier**: editorial, precise, warm, and visibly made by a person who maps systems for a living.

### Principles

- Information hierarchy over decorative components.
- Editorial typography with a serious display face, readable body text, and monospace metadata.
- Warm paper/ink foundation with one high-signal yellow and one cool operational accent.
- Subtle grid, rule, annotation, and diagram motifs retained from the existing hand-drawn identity.
- Restraint: no purple AI gradients, glass-card wall, stock icon grid, oversized pills, or excessive rounding.
- Motion only when it clarifies state or sequence. Respect `prefers-reduced-motion`.
- Cards used only when content is genuinely bounded; major sections should feel like a composed page, not a dashboard.

### Layout

- Mobile-first single-column reading order.
- Desktop uses asymmetric editorial grids and generous but disciplined negative space.
- The Level Up case study receives the largest visual footprint.
- Projects are visible without a carousel.
- Experience is readable without stacked-card interactions.

## Tech Stack and Commands

- Framework: Astro 5 with Astro components and selective Svelte/React islands.
- Language: TypeScript and CSS.
- Build: `bun run build`
- Test: `bun run test`
- Development: `bun run dev`
- Deployment: `bun run deploy:web`

No new UI framework or runtime dependency is required for the reboot.

## Project Structure

- `src/pages/index.astro`: homepage composition.
- `src/components/sections/`: hero, signature case study, approach, work, experience, contact.
- `src/components/core/`: portfolio navigation and footer behavior.
- `src/lib/constants.ts`: public portfolio content and links.
- `src/styles/`: global visual tokens and shared primitives.
- `src/content/blog/`: existing notes.
- `docs/portfolio-reboot-spec.md`: this source of truth.

## Code Style

Prefer content-bearing semantic Astro components with minimal client JavaScript:

```astro
<section aria-labelledby="level-up-title">
  <p class="section-kicker">01 · Signature system</p>
  <h2 id="level-up-title">An operating layer for a mortgage brokerage</h2>
  <p>Business context before implementation detail.</p>
</section>
```

- Use semantic headings in order.
- Use design tokens instead of isolated raw values where practical.
- Keep public copy in data only when reuse or iteration benefits from it; avoid configuration-heavy abstractions.
- Prefer server-rendered Astro markup over hydrated islands for static portfolio content.

## Testing Strategy

- Unit tests for any new content-selection, filtering, or interaction logic.
- `bun run test` for the existing suite.
- `bun run build` for Astro, TypeScript, route, and production-adapter validation.
- Browser verification at 320, 768, 1024, and 1440 pixel widths.
- Keyboard pass for navigation, links, theme controls, and any remaining interaction.
- Accessibility inspection for heading order, landmark structure, accessible names, and contrast.
- Clean browser console on the homepage.
- Production smoke test after deployment.

## Boundaries

### Always

- Preserve unrelated user changes already in the worktree.
- Use evidence-backed claims and collaborative language for shared work.
- Keep the site legible to both business and technical reviewers.
- Keep the existing Canvas application and backend behavior intact.
- Verify links, responsive behavior, tests, build, and production rendering.

### Ask first

- Publish confidential client or operational metrics.
- Make `lum-brain` public or expose private source code.
- Change domain, hosting provider, authentication provider, or database schema.
- Remove the Canvas product or split it into another repository.

### Never

- Invent adoption metrics, revenue impact, time savings, or technical ownership.
- Present `lum-brain` as a solo project.
- Publish private repository content, client data, credentials, or internal screenshots.
- Use the website to claim a formal title that Level Up has not given Rohan; role framing may clarify scope but must preserve the official title.

## Success Criteria

- The first viewport communicates one stable role identity and one concrete value proposition.
- Level Up Mortgages is the leading proof point and explains business problem, contribution, system scope, trust controls, and adoption work.
- A recruiter can understand the portfolio without opening a carousel, stacked card, private repository, or authenticated product route.
- The copy reflects leadership, consultation, training, adoption, and hands-on delivery without overclaiming sole ownership.
- All featured project links are current and functional.
- Public homepage navigation contains no login/user-menu control.
- The homepage meets WCAG 2.1 AA contrast and keyboard requirements.
- The page works at 320, 768, 1024, and 1440 pixel widths.
- Tests and production build pass.
- The existing daily job-search automation is updated, not duplicated, to use this positioning and the live case study as candidate evidence.
- The reboot is committed, pushed, deployed, and verified at the production domain.

## Open Questions

1. Whether the preferred public role label should remain `AI Product & Systems Builder` or use the more job-title-like `AI Product & Systems Engineer`.
2. Whether a current resume should be published as a downloadable file once its Level Up entry is finalized.
3. Whether Level Up can eventually approve public screenshots or quantified outcomes for a deeper case study.
