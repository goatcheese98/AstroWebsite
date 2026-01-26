// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const target = process.env.DEPLOY_TARGET || 'static';
const isCloudflare = target === 'cloudflare';

/** @type {import('astro/config').AstroUserConfig['adapter']} */
let adapter;
if (isCloudflare) {
  const cloudflare = (await import('@astrojs/cloudflare')).default;
  adapter = cloudflare();
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://rohanjasani.dev',
  output: isCloudflare ? 'hybrid' : 'static',
  adapter,
  integrations: [sitemap()],
  build: {
    assets: 'assets',
  },
});
