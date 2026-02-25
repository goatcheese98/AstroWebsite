#!/bin/bash
# Dev script for full website with working auth
# Usage: bun run dev:preview

set -e

echo "🚀 Starting Full Website Dev Server..."

# Build the FULL project (not canvas-only)
echo "📦 Building full website..."
bunx --bun astro build

# Start wrangler pages dev
echo "🌐 Starting dev server on http://localhost:4321"
echo "✅ Auth endpoints will work correctly!"
echo ""
bunx wrangler pages dev dist --port=4321
