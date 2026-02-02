// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'https://rohanjasani.com',
  output: 'server',
  adapter: cloudflare(),
  integrations: [sitemap(), react(), svelte()],
  build: {
    assets: 'assets',
  },
  vite: {
    build: {
      minify: 'esbuild',
    },
    esbuild: {
      // This removes all console.log and debugger statements from the production build
      // but keeps them perfectly intact during 'npm run dev'
      drop: ['console', 'debugger'],
    },
    optimizeDeps: {
      include: [
        '@excalidraw/excalidraw',
        'nanoid',
        'react',
        'react-dom',
      ],
      exclude: [],
    },
    ssr: {
      noExternal: ['@excalidraw/excalidraw'],
    },
  },
});
