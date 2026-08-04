# Portfolio refinement and legacy Canvas retirement

Status: approved from the August 3, 2026 design direction

## Objective

Refine the existing hand-drawn portfolio into a credible, mobile-first professional homepage without erasing its personality. The site should feel deliberately made by Rohan: crisp information architecture and controls, with sketch texture reserved for outlines, annotations, Marvin, and restrained yellow accents.

## Design principles

- Keep the current visual language: dot grid, hand-drawn type, Marvin, imperfect outlines, black ink, and yellow accents.
- Make content and controls crisp. Never blur, fade, distort, or reduce the opacity of project content to imply hierarchy.
- Prefer one clear hierarchy over repeated equal cards. Keep copy short and evidence-led.
- Keep interaction purposeful. Remove carousel mechanics and client-side code that do not improve comprehension.
- Start with the narrow layout. Every section must work at 320px before expanding to tablet and desktop.
- Use the existing stack and tokens; add no UI dependency.

## Homepage structure

1. Compact portfolio navigation: Work, Experience, Notes, and Contact.
2. Existing hero and Marvin, with the current AI product and systems positioning.
3. Existing experience section, preserving Level Up as the current role.
4. Selected work: one featured RoopStudio case-study card and a concise supporting-project grid.
5. Working toolkit: three compact capability groups covering AI systems, product delivery, and platform/reliability.
6. A concise contact footer aligned with the current role direction.

## Component behavior

### Selected work

- Render projects as a static semantic grid rather than a carousel.
- Feature RoopStudio prominently; keep every project fully legible and directly reachable.
- Use crisp, conventional action buttons with clear labels such as “View project” and “View code.”
- Apply sketch texture only to decorative card outlines, never to the button or its text.
- On mobile, render a single-column reading order with no horizontal scrolling.

### Working toolkit

- Replace the six-card skills wall with three static capability rows/groups.
- Remove the Svelte client island and entrance animation from this section.
- Keep the content concise and aligned to applied AI, delivery, and reliable implementation.

### Navigation and footer

- Remove AI Canvas, Dashboard, and account controls from the portfolio header.
- Keep theme switching.
- Update outdated analytics/internship language in the footer.
- Keep all important actions reachable with keyboard focus and at least a 44px touch target where practical.

## Legacy Canvas retirement boundary

RoopStudio now lives in the separate `AICanvas` repository and has its own web/API application. In this repository:

- Remove the old Canvas/Dashboard links from the portfolio.
- Retire the duplicate Canvas-only build and deployment workflow so this repository cannot overwrite the migrated product.
- Replace obsolete local routes with permanent redirects to the relevant RoopStudio destination where continuity is useful.
- Remove portfolio-only authentication bootstrapping after no public portfolio route consumes it.
- Do not edit, move, stage, or delete the existing uncommitted `new-lex` work. Deeper source deletion is a separate cleanup after that work is reconciled with RoopStudio.
- Record what remains and why so the archived code is not mistaken for an active product surface.

## Quality gates

- Content tests prove the new navigation, project order, and retirement destinations.
- All existing tests pass; TypeScript and both relevant builds remain clean.
- Browser QA covers 320px, 768px, 1024px, and desktop widths.
- No horizontal overflow, hazy project content, console errors, or inaccessible action labels.
- Production smoke test verifies the homepage, Notes, and legacy route redirects.

## Non-goals

- Rebranding the site into a new design system.
- Rebuilding RoopStudio inside this repository.
- Adding case-study pages or long-form portfolio copy in this pass.
- Deleting uncommitted Canvas/editor work.
