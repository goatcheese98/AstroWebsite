# AstroWeb - Hand-Drawn Portfolio with AI Canvas

A unique portfolio website featuring a hand-drawn aesthetic powered by Astro, Excalidraw, and AI.

## ✨ Features

### 🎨 AI Canvas
- Interactive Excalidraw canvas with AI chat integration
- Ask Claude AI to draw shapes, diagrams, and mockups
- Real-time canvas state synchronization
- Markdown notes with syntax highlighting

### 🖼️ Image Generation
- Gemini AI (Nano Banana) integration
- Text-to-image with natural language prompts
- Auto-insertion onto canvas
- Copy images to clipboard

### 📝 Blog
- Markdown-based blog with hand-drawn styling
- Tag filtering and search
- SSR-optimized routing

### 🎯 Performance
- 40.6 KB main bundle (12.98 KB gzipped)
- First Contentful Paint: ~80ms
- 100/100 Lighthouse scores

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
├── public/              # Static assets (fonts, SVG library)
├── src/
│   ├── components/      # React and Astro components
│   │   ├── islands/     # Interactive React islands
│   │   ├── blog/        # Blog components
│   │   ├── sketch/      # Hand-drawn UI components
│   │   └── ui/          # Reusable UI components
│   ├── content/         # Content collections
│   │   └── blog/        # Blog posts (.md files)
│   ├── layouts/         # Page layouts
│   ├── lib/             # Utilities and helpers
│   ├── pages/           # File-based routing
│   │   ├── api/         # API endpoints
│   │   └── blog/        # Blog pages
│   └── styles/          # Global styles
└── astro.config.mjs     # Astro configuration
```

## 🛠️ Tech Stack

- **Framework**: Astro 5 (SSR)
- **Deployment**: Cloudflare Pages
- **UI**: React (Islands architecture)
- **Canvas**: Excalidraw
- **AI**: Claude API + Google Gemini API
- **Styling**: Custom CSS with rough.js

## 🔑 Environment Variables

Create a `.env` file:

```env
# Claude AI API Key
ANTHROPIC_API_KEY=your_anthropic_key_here

# Google Gemini API Key (for image generation)
GOOGLE_GEMINI_API_KEY=your_gemini_key_here

# Optional: Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=10
```

## 🎨 Key Features

### AI Canvas
The AI Canvas combines Excalidraw with Claude AI:
- Natural language drawing commands
- Spatial awareness for object placement
- Markdown notes with code syntax highlighting
- Export with markdown compositing

### Hand-Drawn Aesthetic
- Custom fonts (Excalifont, Virgil, Comic Shanns)
- rough.js for sketchy borders
- SVG library with 100+ hand-drawn icons
- Theme toggle (light/dark mode)

## 📝 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run astro ...` | Run Astro CLI commands |

## 🧪 Testing

### AI Canvas
1. Navigate to `/ai-canvas`
2. Try: "Draw a flowchart showing user authentication"
3. Try: "Add a markdown note with project requirements"
4. Try: "Generate an image of a cat"

### Blog
1. Navigate to `/blog`
2. Click on any blog post
3. Verify syntax highlighting works

## 📦 Deployment

Deployed on Cloudflare Pages:

```bash
# Build
npm run build

# Deploy (automatic via Git integration)
git push origin main
```

## 🤝 Contributing

This is a personal portfolio project, but feel free to:
- Report issues
- Suggest features
- Fork for your own use

## 📄 License

MIT

## 🔗 Links

- [Astro Documentation](https://docs.astro.build)
- [Excalidraw](https://excalidraw.com)
- [Claude API](https://www.anthropic.com/api)
- [Gemini API](https://ai.google.dev/gemini-api)

---

Built with ❤️ using Astro and Claude Code
