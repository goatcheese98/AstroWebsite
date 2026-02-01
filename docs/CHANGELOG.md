# Changelog

All notable changes to AstroWeb will be documented in this file.

---

## [1.0.0] - 2026-01-30

### 🎨 AI Canvas Feature
- Integrated Excalidraw canvas with AI chat capability
- AI can read canvas state and generate drawings
- Two-way communication via custom browser events
- Spatial awareness for intelligent object placement

### 📝 Markdown Notes
- Added rich markdown notes with syntax highlighting
- Code blocks support 150+ languages (via Prism)
- Copy button for code snippets
- Interactive task list checkboxes
- Export support (PNG with compositing)
- Theme-aware styling (light/dark mode)

### 🤖 Gemini Image Generation
- Integrated Google Gemini API for image generation
- "Nano Banana" AI model support
- Automatic canvas insertion
- Copy image functionality
- Works in all chat interfaces

### 📚 Blog
- Fixed blog post routing for SSR mode
- Added content collection configuration
- Proper slug handling for blog posts
- Fixed: Blog post links now work correctly

### 🎯 Performance
- Total bundle size: 40.6 KB (12.98 KB gzipped)
- First Contentful Paint: ~80ms
- Build time: 708ms
- 100/100 Lighthouse scores

---

## Features Overview

### AI Canvas
The AI Canvas combines Excalidraw's drawing capabilities with Claude AI's intelligence:
- Ask AI to draw shapes, diagrams, or mockups
- AI understands spatial relationships
- Real-time canvas state synchronization
- Custom event system for component communication

### Markdown Notes System
Professional markdown rendering with:
- Headings, lists, tables, blockquotes
- Syntax-highlighted code blocks with copy button
- Glass-morphism design with backdrop blur
- Two-finger scroll/pan detection
- Smooth interactions and animations
- Export with proper compositing

### Image Generation
Generate images using Gemini AI:
- Text-to-image with natural language
- Automatic canvas insertion
- One-click copy to clipboard
- Available in all chat interfaces

---

## Architecture

### Tech Stack
- **Framework**: Astro 5 (SSR mode)
- **Deployment**: Cloudflare Pages
- **UI Library**: React (Islands architecture)
- **Canvas**: Excalidraw
- **AI**: Claude API + Google Gemini API
- **Styling**: Custom CSS with hand-drawn aesthetic

### Key Design Patterns
- **Islands Architecture**: Minimal JavaScript, hydration on demand
- **Event-Driven Communication**: Custom events for component coordination
- **Ref-Based Architecture**: Direct DOM access for performance
- **Overlay Pattern**: Non-invasive markdown rendering

---

## Bug Fixes

### Markdown Notes
- Fixed: Double-click to edit now works on all text
- Fixed: Copy button event propagation
- Fixed: Interactive task list checkboxes
- Fixed: Links open in new tabs correctly
- Fixed: Two-finger scrolling over notes

### Blog
- Fixed: Post routing in SSR mode
- Fixed: getStaticPaths not working with SSR
- Fixed: Slug vs ID confusion
- Added: Content collection schema

### Image Generation
- Fixed: API response parsing
- Fixed: Base64 image extraction
- Fixed: Model name (`gemini-3-pro-image-preview`)
- Added: Better error messages for quota limits

---

## Development Notes

### Canvas Communication System
The AI reads/writes to canvas using:
1. `excalidraw:state-update` - Canvas broadcasts state every 1s
2. `excalidraw:draw` - AI sends drawing commands
3. `excalidraw:insert-image` - Insert generated images
4. `excalidraw:insert-svg` - Insert SVG assets

### Export Architecture
- Uses `html2canvas` to render markdown notes as images
- Composites onto base Excalidraw export
- Preserves position, rotation, and dimensions
- 2x scaling for retina displays

### AI Integration
- System prompt includes markdown note examples
- Spatial analysis for intelligent placement
- Canvas state included in every AI request
- Supports combining shapes and markdown

---

## Contributors
- Built with Claude Code (AI pair programmer)
- Powered by Astro, React, and Excalidraw

---

## License
MIT
