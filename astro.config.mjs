// @ts-check
import { defineConfig } from 'astro/config';
import clerk from '@clerk/astro';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import fs from 'fs';
import path from 'path';

// Deployment target: 'full' (default) or 'canvas' (AI canvas only)
const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'full';

/**
 * Filter pages for canvas-only deployment
 * This removes non-essential pages from the build
 */
function filterPages() {
    if (DEPLOY_TARGET === 'full') return;

    const pagesDir = path.resolve('./src/pages');
    const canvasOnlyPages = ['index.astro', 'ai-canvas.astro', '404.astro', 'login.astro', 'signup.astro', 'dashboard.astro'];

    // Get all .astro files
    const allPages = fs.readdirSync(pagesDir)
        .filter(f => f.endsWith('.astro'))
        .filter(f => !canvasOnlyPages.includes(f));

    // Remove non-canvas pages temporarily by renaming with .bak extension
    allPages.forEach(page => {
        const pagePath = path.join(pagesDir, page);
        const backupPath = path.join(pagesDir, `${page}.bak`);
        if (fs.existsSync(pagePath) && !fs.existsSync(backupPath)) {
            fs.renameSync(pagePath, backupPath);
            console.log(`[canvas-build] Excluded: ${page}`);
        }
    });

    // Clean up blog directory
    const blogDir = path.join(pagesDir, 'blog');
    if (fs.existsSync(blogDir)) {
        fs.renameSync(blogDir, `${blogDir}.bak`);
        console.log('[canvas-build] Excluded: blog/');
    }
}

/**
 * Restore pages after build (for dev mode)
 */
function restorePages() {
    const pagesDir = path.resolve('./src/pages');

    // Restore .astro.bak files
    fs.readdirSync(pagesDir)
        .filter(f => f.endsWith('.astro.bak'))
        .forEach(bakFile => {
            const originalName = bakFile.replace('.bak', '');
            fs.renameSync(
                path.join(pagesDir, bakFile),
                path.join(pagesDir, originalName)
            );
        });

    // Restore blog directory
    const blogBackup = path.join(pagesDir, 'blog.bak');
    if (fs.existsSync(blogBackup)) {
        fs.renameSync(blogBackup, path.join(pagesDir, 'blog'));
    }
}

// Run filter before build if in canvas mode
if (DEPLOY_TARGET === 'canvas') {
    filterPages();

    // Register cleanup on process exit
    process.on('exit', restorePages);
    process.on('SIGINT', () => {
        restorePages();
        process.exit(0);
    });
}

// Determine site URL based on target
const siteUrl = DEPLOY_TARGET === 'canvas'
    ? (process.env.CANVAS_SITE_URL || 'https://canvas.rohanjasani.com')
    : (process.env.SITE_URL || 'https://rohanjasani.com');

console.log(`[astro-config] Deploy target: ${DEPLOY_TARGET}`);
console.log(`[astro-config] Site URL: ${siteUrl}`);

export default defineConfig({
    site: siteUrl,
    output: 'server',
    adapter: cloudflare({
        platformProxy: {
            enabled: true,
            configPath: './wrangler.jsonc',
        },
    }),
    integrations: [
        clerk(),
        // Disable sitemap for canvas-only builds
        ...(DEPLOY_TARGET === 'full' ? [sitemap()] : []),
        react(),
        svelte()
    ],
    build: {
        assets: 'assets',
        // Faster builds: don't inline small assets
        assetsInlineLimit: 4096,
    },
    vite: {
        build: {
            minify: 'esbuild',
            rollupOptions: {
                output: {
                    // Manual chunking for faster builds & better caching
                    manualChunks: {
                        'excalidraw-vendor': ['@excalidraw/excalidraw', '@excalidraw/mermaid-to-excalidraw'],
                        'lexical-vendor': ['lexical'],
                        'graph-vendor': ['cytoscape', 'cytoscape-cose-bilkent'],
                        'react-vendor': ['react', 'react-dom', 'zustand'],
                    },
                },
            },
            // Enable parallel processing
            target: 'esnext',
        },
        esbuild: {
            // This removes all console.log and debugger statements from the production build
            // but keeps them perfectly intact during 'npm run dev'
            drop: ['console', 'debugger'],
        },
        optimizeDeps: {
            include: [
                '@excalidraw/excalidraw',
                '@excalidraw/mermaid-to-excalidraw',
                'nanoid',
                'react',
                'react-dom',
                'cytoscape',
                'cytoscape-cose-bilkent',
                'lexical',
                'zustand',
                'zod',
                'html2canvas',
                'katex',
            ],
            exclude: [],
            force: false, // Don't force re-optimization
        },
        ssr: {
            noExternal: ['@excalidraw/excalidraw'],
        },
    },
});
