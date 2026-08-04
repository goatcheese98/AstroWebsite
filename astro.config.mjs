// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import cloudflare from "@astrojs/cloudflare";

const siteUrl = process.env.SITE_URL || "https://rohanjasani.com";

export default defineConfig({
  site: siteUrl,
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: "./wrangler.jsonc",
    },
  }),
  integrations: [sitemap(), svelte()],
  build: {
    assets: "assets",
  },
  vite: {
    // Keep a single three.js instance across core and examples/jsm imports.
    resolve: {
      dedupe: ["three"],
    },
    build: {
      minify: "esbuild",
      assetsInlineLimit: 4096,
      target: "esnext",
    },
    esbuild: {
      drop: ["console", "debugger"],
    },
  },
});
