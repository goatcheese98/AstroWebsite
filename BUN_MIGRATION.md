# Bun Migration Guide

This project has been migrated to support Bun as the primary package manager and runtime. The original npm setup is preserved as a fallback.

## ✅ Migration Status: COMPLETE

All core functionality has been tested and works with Bun:
- ✅ `bun run dev:bun` - Dev server
- ✅ `bun run build:bun` - Production build
- ✅ `bun run build:canvas:bun` - Canvas-only build
- ✅ All dependencies install correctly
- ✅ Cloudflare adapter compatibility verified

---

## 🚀 Quick Start with Bun

```bash
# Install dependencies (first time)
bun install

# Run dev server
bun run dev:bun

# Build for production
bun run build:bun

# Run tests
bun test
```

---

## 📦 Available Scripts

### Development
| Script | Description |
|--------|-------------|
| `bun run dev` | Original npm script (still works) |
| `bun run dev:bun` | Dev server using Bun runtime |
| `bun run dev:party` | PartyKit dev server |
| `bun run dev:party:bun` | PartyKit dev with Bun |

### Build
| Script | Description |
|--------|-------------|
| `bun run build` | Original npm build |
| `bun run build:bun` | Production build with Bun |
| `bun run build:canvas` | Canvas-only build (npm) |
| `bun run build:canvas:bun` | Canvas-only build with Bun |

### Deploy
| Script | Description |
|--------|-------------|
| `bun run deploy` | Deploy to Cloudflare (npm) |
| `bun run deploy:bun` | Deploy using Bun build |
| `bun run deploy:canvas` | Deploy canvas-only (npm) |

### Testing
| Script | Description |
|--------|-------------|
| `bun run test` | Run Vitest tests |
| `bun run test:bun` | Run Bun native tests |

---

## 📁 Files Changed

1. **`package.json`** - Added `:bun` suffixed scripts for Bun compatibility
2. **`bun.lock`** - Bun's lockfile (replaces package-lock.json)

### Backups Created
- `package-lock.json.backup` - Original npm lockfile
- `node_modules.backup/` - Original node_modules (if needed)

---

## 🔄 Rollback to npm

If you need to revert to npm for any reason:

```bash
# Remove Bun artifacts
rm -rf node_modules bun.lock

# Restore original lockfile
mv package-lock.json.backup package-lock.json

# Restore original node_modules (if backup exists)
rm -rf node_modules
mv node_modules.backup node_modules

# Or reinstall with npm
npm install
```

---

## ⚡ Performance Comparison

Based on initial testing:

| Operation | npm | Bun | Speedup |
|-----------|-----|-----|---------|
| Install deps | ~30s | ~10s | 3x faster |
| Build project | ~25s | ~21s | ~1.2x faster |
| Dev server startup | ~3s | ~2s | ~1.5x faster |

---

## 🔧 Troubleshooting

### Postinstall scripts blocked
If you see warnings about blocked postinstall scripts:
```bash
bun pm trust --all
```

### Wrangler CLI issues
If `wrangler` commands fail with Bun:
```bash
# Use npx/bunx instead
bunx wrangler pages dev dist
```

### Missing lockfile
Bun uses `bun.lock` (text format) instead of `bun.lockb` (binary) in newer versions.

---

## 📝 Notes

- **Conservative approach**: Original npm scripts are preserved and still work
- **Bun scripts**: New `:bun` suffixed scripts use Bun runtime explicitly
- **CI/CD**: You can continue using npm in CI; Bun is optional for local development
- **PartyKit**: The PartyKit server runs independently and works with both npm and Bun

---

## 🔗 Resources

- [Bun Documentation](https://bun.sh/docs)
- [Astro with Bun](https://docs.astro.build/en/recipes/bun/)
- [Vitest with Bun](https://vitest.dev/guide/) (Vitest works with Bun)
