#!/usr/bin/env node
/**
 * Canvas-only build script
 * Filters pages to only include canvas-related routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.join(rootDir, 'src', 'pages');

// Pages to KEEP for canvas-only build
const CANVAS_PAGES = [
  'ai-canvas.astro',
  '404.astro',
  'login.astro',
  'signup.astro',
];

// Pages that will be created/modified
const GENERATED_PAGES = [
  'index.astro', // Will be created from ai-canvas.astro
];

// Pages to EXCLUDE
const EXCLUDED_PAGES = [
  'index.astro',
  'blog.astro',
  'canvases.astro',
  'dashboard.astro',
];

const STATE_FILE = path.join(rootDir, '.canvas-build-state.json');

function saveState(movedFiles) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(movedFiles, null, 2));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return [];
}

function cleanupState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

/**
 * Create index.astro from ai-canvas.astro for canvas-only deployment
 */
function createCanvasIndex(movedFiles) {
  const aiCanvasPath = path.join(pagesDir, 'ai-canvas.astro');
  const indexPath = path.join(pagesDir, 'index.astro');
  
  // If there's already an index.astro, back it up
  if (fs.existsSync(indexPath)) {
    const backupDir = path.join(rootDir, '.temp-pages-backup');
    const backupPath = path.join(backupDir, 'index.astro');
    fs.renameSync(indexPath, backupPath);
    movedFiles.push({ from: indexPath, to: backupPath, type: 'page' });
  }
  
  // Read ai-canvas.astro content
  const aiCanvasContent = fs.readFileSync(aiCanvasPath, 'utf-8');
  
  // Create index.astro with same content but mark it as canvas root
  const indexContent = aiCanvasContent.replace(
    'const CANVAS_REDIRECT = false;',
    'const CANVAS_REDIRECT = false; // Canvas-only deployment'
  );
  
  fs.writeFileSync(indexPath, indexContent);
  movedFiles.push({ 
    from: indexPath, 
    to: 'GENERATED', 
    type: 'generated',
    source: aiCanvasPath 
  });
  
  console.log(`  ✨ Created: index.astro (from ai-canvas.astro)\n`);
}

/**
 * Prepare for canvas build - move excluded pages out of src/pages
 */
export function prepareCanvasBuild() {
  console.log('🔧 Preparing canvas-only build...\n');
  
  const movedFiles = [];
  const backupDir = path.join(rootDir, '.temp-pages-backup');
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Move excluded pages to backup
  EXCLUDED_PAGES.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const backupPath = path.join(backupDir, page);
    
    if (fs.existsSync(pagePath)) {
      fs.renameSync(pagePath, backupPath);
      movedFiles.push({ from: pagePath, to: backupPath, type: 'page' });
      console.log(`  📦 Excluded: ${page}`);
    }
  });
  
  // Move blog directory
  const blogDir = path.join(pagesDir, 'blog');
  const blogBackupDir = path.join(backupDir, 'blog');
  if (fs.existsSync(blogDir)) {
    fs.renameSync(blogDir, blogBackupDir);
    movedFiles.push({ from: blogDir, to: blogBackupDir, type: 'directory' });
    console.log(`  📦 Excluded: blog/`);
  }
  
  // Create index.astro for canvas-only deployment
  createCanvasIndex(movedFiles);
  
  saveState(movedFiles);
  console.log(`\n✅ Prepared ${movedFiles.length} items for canvas build\n`);
  return movedFiles;
}

/**
 * Restore pages after canvas build
 */
export function restorePages() {
  console.log('\n🔄 Restoring pages...\n');
  
  const movedFiles = loadState();
  
  if (movedFiles.length === 0) {
    console.log('  ℹ️  No pages to restore\n');
    return;
  }
  
  movedFiles.forEach(({ from, to, type }) => {
    if (type === 'generated') {
      // Remove generated files
      if (fs.existsSync(from)) {
        fs.unlinkSync(from);
        console.log(`  🗑️  Removed generated: ${path.basename(from)}`);
      }
    } else if (fs.existsSync(to)) {
      // Ensure parent directory exists
      const parentDir = path.dirname(from);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      
      fs.renameSync(to, from);
      console.log(`  ↩️  Restored: ${path.basename(from)}`);
    }
  });
  
  // Clean up backup directory if empty
  const backupDir = path.join(rootDir, '.temp-pages-backup');
  if (fs.existsSync(backupDir)) {
    const remaining = fs.readdirSync(backupDir);
    if (remaining.length === 0) {
      fs.rmdirSync(backupDir);
    }
  }
  
  cleanupState();
  console.log(`\n✅ Restored ${movedFiles.length} items\n`);
}

// CLI usage
const command = process.argv[2];

if (command === 'prepare') {
  prepareCanvasBuild();
} else if (command === 'restore') {
  restorePages();
} else if (command === 'status') {
  const state = loadState();
  if (state.length > 0) {
    console.log('Canvas build state: pages are currently excluded');
    console.log('Run "restore" to restore pages');
  } else {
    console.log('Canvas build state: all pages present');
  }
} else {
  console.log('Usage: node scripts/build-canvas.js [prepare|restore|status]');
  process.exit(1);
}
