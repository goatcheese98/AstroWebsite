---
title: "Building a Hand-Drawn Portfolio with Astro and rough.js"
description: "How I built this portfolio site using Excalidraw's design language, Astro's island architecture, and zero-JS hand-drawn borders."
pubDate: 2025-01-20
tags: ["astro", "design", "rough.js", "css"]
---

## Why Hand-Drawn?

Most developer portfolios look the same: clean lines, subtle gradients, sans-serif fonts. There's nothing wrong with that, but I wanted something that felt more personal -- like opening someone's notebook rather than their resume.

Excalidraw's visual language immediately caught my attention. It looks informal and approachable while still being perfectly functional. The intentional imperfection signals "work in progress" rather than "finished product," which feels right for a portfolio that grows over time.

## The Technical Approach

### Zero-JS Borders with SVG Filters

The biggest win was discovering that hand-drawn borders don't need JavaScript at all. An SVG `feTurbulence` filter generates Perlin noise, and `feDisplacementMap` uses that noise to distort any element's borders:

```html
<svg style="position: absolute; width: 0; height: 0;">
  <filter id="sketch-filter">
    <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" seed="2" />
    <feDisplacementMap in="SourceGraphic" scale="3" />
  </filter>
</svg>
```

Then any element gets hand-drawn borders with a single CSS property:

```css
.card {
  border: 2px solid #1e1e1e;
  filter: url(#sketch-filter);
}
```

This technique costs zero bytes of JavaScript and works in all modern browsers.

### rough.js for Interactive Elements

For elements that need interactivity -- hover effects, animated drawing, hachure fills -- I use [rough.js](https://roughjs.com/) wrapped in Preact islands. These only load when the user scrolls to them (`client:visible`), so they don't block initial page load.

### Font Choices

- **Excalifont** for headings: The official Excalidraw font, hand-drawn but legible
- **Comic Shanns** for body text: A playful monospace that matches the aesthetic
- Both self-hosted as woff2 with `font-display: swap`

## Performance Results

The total client-side JavaScript budget is under 16KB gzipped, all lazily loaded. First paint is fonts + CSS only. Lighthouse scores: 100/100 across all categories.

Building with constraints like these forces creative solutions. Sometimes the simplest approach -- an SVG filter defined once and referenced everywhere -- is the most elegant.
