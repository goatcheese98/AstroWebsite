// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'https://rohanjasani.dev',
  output: 'server',
  adapter: cloudflare(),
  integrations: [sitemap(), react()],
  build: {
    assets: 'assets',
  },
});
