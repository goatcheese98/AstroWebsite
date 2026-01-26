---
title: "Astro Islands: Ship Less JavaScript, Stay Interactive"
description: "A practical guide to Astro's island architecture -- how to get interactive components without the cost of a full SPA framework."
pubDate: 2025-01-15
tags: ["astro", "performance", "javascript", "architecture"]
---

## The Problem with SPAs

Single-page applications ship JavaScript for everything -- even content that never changes. A blog post with a like button sends the entire React runtime just to handle one click. This is expensive: users pay in download time, parse time, and hydration time.

## Islands to the Rescue

Astro's island architecture flips the default. Pages are static HTML by default. Interactive components are explicitly opted-in with client directives:

```astro
<!-- Static by default, no JS shipped -->
<Header />
<BlogPost />

<!-- This component gets JavaScript -->
<LikeButton client:visible />
```

The `client:visible` directive means the component's JavaScript only loads when the user scrolls to it. Other options include:

- `client:load` -- Load immediately (for above-the-fold interactivity)
- `client:idle` -- Load when the browser is idle
- `client:media` -- Load when a media query matches
- `client:only` -- Skip SSR, render client-side only

## Practical Example

On this portfolio, I use three islands:

1. **SkillsChart** (`client:visible`) -- rough.js animated bar chart, loads when you scroll to the skills section
2. **AnnotationGroup** (`client:idle`) -- rough-notation text annotations, loads during idle time
3. **ProjectCard** (`client:visible`) -- hover-interactive cards with rough.js borders

Total JavaScript for all three: ~16KB gzipped. Compare that to a React SPA at 40KB+ just for the runtime.

## When to Use Islands

Islands work best when:

- Most of your content is static (blogs, portfolios, documentation)
- Interactivity is localized to specific components
- Performance matters (it always does)

They're not ideal when every component on the page is deeply interactive and shares lots of state -- that's where a full SPA framework still makes sense.

The key insight is that most websites have far less interactivity than we think. A portfolio site with a theme toggle and some hover effects doesn't need 100KB of framework code.
