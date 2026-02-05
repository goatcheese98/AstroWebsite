# Multi-Deployment Guide

This project supports deploying to multiple targets from the same codebase:

1. **Full Site** (`rohanjasani.com`) - Portfolio + Blog + AI Canvas
2. **Canvas Only** (`canvas.rohanjasani.com`) - Just the AI Canvas app

## Quick Start

### Deploy Full Site (Default)
```bash
npm run deploy
```

### Deploy Canvas-Only
```bash
npm run deploy:canvas
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with full site |
| `npm run dev:canvas` | Start dev server with canvas-only |
| `npm run build` | Build full site |
| `npm run build:canvas` | Build canvas-only |
| `npm run deploy` | Deploy full site to rohanjasani.com |
| `npm run deploy:canvas` | Deploy canvas-only to ai-canvas project |

## Configuration

### Environment Variables

Create `.env.local`:

```bash
# For full site (default)
SITE_URL=https://rohanjasani.com

# For canvas-only deployment
CANVAS_SITE_URL=https://canvas.rohanjasani.com
```

### Cloudflare Pages Setup

#### Full Site Project
- **Project name**: `astroweb`
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Config file**: `wrangler.jsonc`

#### Canvas-Only Project
- **Project name**: `ai-canvas`
- **Build command**: `npm run build:canvas`
- **Output directory**: `dist`
- **Config file**: `wrangler.canvas.toml` (used by deploy script)

## How It Works

### Page Filtering (Canvas-Only Build)

The canvas-only build uses a two-step filtering process:

1. **`scripts/build-canvas.js`** - File system changes:
   - Backs up `src/pages/index.astro` (home page)
   - Copies `ai-canvas.astro` content to `index.astro`
   - Moves non-canvas pages (blog, canvases, dashboard) to backup
   - Moves `blog/` directory to backup

2. **`astro.config.mjs`** - Build-time filtering:
   - `filterPages()` keeps only: `index.astro`, `ai-canvas.astro`, `404.astro`, `login.astro`, `signup.astro`
   - All other `.astro` files are excluded from the build

3. **After build** - Restoration:
   - Original `index.astro` (home page) is restored
   - All backed up pages are restored

### Navigation Detection

The Header component (`src/components/core/Header.astro`) detects canvas-only mode:

```astro
const siteUrl = Astro.site?.toString() || '';
const isCanvasOnly = siteUrl.includes('canvas.') || currentPath === '/ai-canvas';
```

When `isCanvasOnly` is true, it shows `CANVAS_NAV_LINKS` (just "AI Canvas" at `/`) instead of the full navigation.

### Navigation Links

Configured in `src/lib/constants.ts`:

```typescript
// Full site navigation
export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'AI Canvas', href: '/ai-canvas' },
  { label: 'Blog', href: '/blog' },
];

// Canvas-only navigation
export const CANVAS_NAV_LINKS: NavLink[] = [
  { label: 'AI Canvas', href: '/' },
];
```

### Theme Handling

**Main Site** (`rohanjasani.com`):
- Respects user's system preference (light/dark)
- Theme toggle button visible and functional
- Saves preference to localStorage
- Supports both light and dark modes

**Canvas Site** (`canvas.rohanjasani.com`):
- Always forces light mode (optimal for Excalidraw)
- Theme toggle button is hidden
- Excalidraw canvas always renders in light theme

The theme is initialized in `BaseLayout.astro`:
```javascript
// Check if we're on a canvas subdomain
var isCanvas = hostname.includes('canvas.') || pathname === '/ai-canvas';

if (isCanvas) {
  // Force light mode on canvas pages
  document.documentElement.setAttribute('data-theme', 'light');
} else {
  // Use saved preference or system preference on main site
  var saved = localStorage.getItem('theme');
  var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', saved || preferred);
}
```

### Wrangler Configuration

#### Full Site (`wrangler.jsonc`)
```jsonc
{
  "name": "astroweb",
  "compatibility_date": "2025-01-20",
  "pages_build_output_dir": "./dist",
  // ... bindings
}
```

#### Canvas-Only (`wrangler.canvas.toml`)
```toml
name = "ai-canvas"
compatibility_date = "2025-01-20"
pages_build_output_dir = "./dist"
# ... bindings
```

**Note**: For Cloudflare Pages deployments, use `pages_build_output_dir` instead of `main`. The `main` field is only for Workers deployments.

### Shared Resources

Both deployments share:
- D1 Database (`astroweb-db`)
- KV Namespaces (`SESSION_KV`, `RATE_LIMIT_KV`)
- R2 Bucket (`CANVAS_STORAGE`)

## File Structure

```
src/pages/
├── index.astro          # Home page (full site) / Canvas page (canvas-only)
├── ai-canvas.astro      # Canvas page (available at /ai-canvas on full site)
├── 404.astro            # Error page (always included)
├── login.astro          # Auth pages (always included)
├── signup.astro
├── blog/                # Blog pages (excluded from canvas build)
│   ├── index.astro
│   └── [slug].astro
├── blog.astro           # Blog listing (excluded from canvas build)
├── canvases.astro       # Canvas gallery (excluded from canvas build)
└── dashboard.astro      # User dashboard (excluded from canvas build)
```

## Troubleshooting

### Build fails with "pages not found"
Run: `node scripts/build-canvas.js restore`

### Deploy fails with config error
Make sure you're using `npm run deploy:canvas` (not direct wrangler command)

### Pages are missing after failed build
Check `.temp-pages-backup/` and restore manually if needed:
```bash
# Restore from backup
mv .temp-pages-backup/index-home.astro src/pages/index.astro
mv .temp-pages-backup/blog src/pages/
mv .temp-pages-backup/*.astro src/pages/ 2>/dev/null || true
rm -rf .temp-pages-backup
```

### Root URL shows 404 on canvas deployment
Make sure both `index.astro` and `ai-canvas.astro` are in the allowed pages list in `astro.config.mjs`:
```javascript
const canvasOnlyPages = ['index.astro', 'ai-canvas.astro', '404.astro', 'login.astro', 'signup.astro'];
```

### Navigation shows Home/Blog on canvas domain
Check that `CANVAS_SITE_URL` is set correctly in your environment and that the Header component is detecting `siteUrl.includes('canvas.')`.

### Theme toggle not working on main site
Check that `src/lib/theme.ts` has the full theme functionality restored (not locked to light mode).

### Canvas page showing in dark mode
The canvas pages force light mode via inline script in `BaseLayout.astro`. If dark mode appears, check that the script is running:
```javascript
var isCanvas = hostname.includes('canvas.') || pathname === '/ai-canvas';
if (isCanvas) {
  document.documentElement.setAttribute('data-theme', 'light');
}
```

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐
│   Full Site     │     │   Canvas Only    │
│  rohanjasani.com│     │ canvas.rohanjas. │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │   ┌─────────────┐     │
         └──►│  Same Code  │◄────┘
             │    Base     │
             └──────┬──────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │   D1    │ │   KV    │ │   R2    │
   │   DB    │ │  Store  │ │  Bucket │
   └─────────┘ └─────────┘ └─────────┘
```
