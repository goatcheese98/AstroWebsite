# Feature-First Migration Strategy

## Purpose
This document captures the current migration philosophy for evolving the canvas product architecture.

It is intentionally lightweight. The goal is not to lock in implementation steps, but to record the current belief that the architecture should be proven through feature extraction before the entire application boundary is finalized.

## Current Position
The long-term direction remains:
- Astro as the portfolio site
- a standalone React application for the canvas product

However, the preferred migration approach is not to move the entire application out of Astro first.

Instead, the current philosophy is to:
- start by extracting bounded feature areas into their own codebases or isolated units
- embed or integrate those features through clearer contracts
- learn from those extractions
- then use those learnings to guide the larger separation of the product app from Astro

## Why This Approach
There are two different architectural changes in play:

1. separating the product app from Astro
2. separating the product app internally into independently bounded feature codebases

Doing both at once would make it harder to understand where integration pain is actually coming from.

By extracting a feature first, the system can answer practical questions earlier:
- what shell-to-feature contract is actually needed
- how persistence should be owned
- how feature failures should be contained
- how state, commands, and embedding should work
- which dependencies belong in the shell versus the feature

## Intended Learning Path
The current belief is that one extracted feature will teach more than a large amount of upfront design.

That first feature should help reveal:
- what a good isolation boundary looks like
- what a plugin or micro-frontend needs from the host
- what should stay centralized
- what can safely become feature-local
- whether the chosen communication pattern feels scalable

## Why Feature-First Fits This Product
The canvas product is expected to grow into many specialized feature surfaces over time.

Examples include:
- Markdown / Lexical notes
- Kanban
- Web embeds
- Prototype tools
- future AI-assisted experimental plugins

If many such features are likely to be added, then the architecture should be tested where the product is most likely to scale: at the feature boundary.

This is especially relevant when AI is a major implementation collaborator, since smaller bounded codebases are often easier to reason about, generate against, and evolve safely.

## Recommended Early Posture
The current posture is:
- do not commit to a rigid final structure too early
- do not assume the whole app must leave Astro before feature extraction starts
- do treat early feature extraction as an architectural experiment
- do expect the first extractions to shape the eventual shell/platform contract

## Candidate First Extractions
At the philosophy level, the strongest early candidates are feature areas that are meaningful but not too central to product orchestration.

Examples:
- Markdown / Lexical note experience
- Kanban
- Web embed

Less ideal as first extractions:
- auth
- AI orchestration
- the overall shell

These more central systems should likely remain closer to the host while the feature boundary pattern is still being learned.

## What Success Looks Like
A successful early extraction should not be judged only by whether the feature still renders.

It should help clarify:
- what the embedding contract should be
- what the persistence contract should be
- what shared dependencies should be minimized
- what can fail independently without destabilizing the rest of the product
- whether the resulting unit is easier to iterate on in production

## Strategic Outcome
If this philosophy works, the product architecture will not be defined only by a one-time migration.

Instead, it will emerge through a sequence of real extractions, each making the system more explicit, more modular, and more scalable for future plugin growth.

## Summary
The current migration philosophy is:
- feature extraction first
- architecture learned through real boundaries
- standalone product separation guided by those learnings afterward

This keeps the migration grounded in actual integration behavior rather than forcing the final architecture to be guessed all at once.
