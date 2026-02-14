#!/usr/bin/env bun
/**
 * Fast build script optimized for Bun
 * Uses Bun's native bundler for better performance
 */

import { $ } from 'bun';

console.log('🚀 Starting fast Bun build...\n');

const startTime = Date.now();

try {
    // Pre-optimize dependencies first (one-time cost)
    console.log('📦 Pre-optimizing dependencies...');
    await $`bunx astro sync`;

    // Build with Astro + Vite (but let Bun handle the runtime)
    console.log('🔨 Building project...');
    process.env.NODE_ENV = 'production';
    
    await $`bunx --bun astro build`;

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Build complete in ${duration}s`);

} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}
