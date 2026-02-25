#!/bin/bash
# Deploy script for AI Canvas (canvas-only deployment)

set -e

echo "🚀 Deploying AI Canvas..."

# Build canvas-only
echo "📦 Building canvas-only..."
bun run build:canvas

# Check if wrangler.toml exists and backup
if [ -f "wrangler.toml" ]; then
    echo "💾 Backing up existing wrangler.toml..."
    mv wrangler.toml wrangler.backup.toml
fi

# Copy canvas config
echo "📝 Using canvas configuration..."
cp wrangler.canvas.toml wrangler.toml

# Deploy
echo "☁️  Deploying to Cloudflare Pages..."
bunx wrangler pages deploy dist --project-name=ai-canvas

# Restore original config
if [ -f "wrangler.backup.toml" ]; then
    echo "🔄 Restoring original wrangler.toml..."
    mv wrangler.backup.toml wrangler.toml
else
    rm wrangler.toml
fi

echo "✅ Canvas deployment complete!"
