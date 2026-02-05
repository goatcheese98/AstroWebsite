#!/usr/bin/env node
/**
 * Canvas-only build script
 * Prepares pages for canvas-only deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.join(rootDir, 'src', 'pages');
const backupDir = path.join(rootDir, '.temp-pages-backup');

const HOME_INDEX_BACKUP = path.join(backupDir, 'index-home.astro');

/**
 * Prepare for canvas build
 */
export function prepareCanvasBuild() {
  console.log('🔧 Preparing canvas-only build...\n');
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Backup the home page index.astro
  const indexPath = path.join(pagesDir, 'index.astro');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, HOME_INDEX_BACKUP);
    console.log('  📦 Backed up home page');
  }
  
  // Replace index.astro with ai-canvas.astro content
  const aiCanvasPath = path.join(pagesDir, 'ai-canvas.astro');
  if (fs.existsSync(aiCanvasPath)) {
    fs.copyFileSync(aiCanvasPath, indexPath);
    console.log('  ✨ Set index.astro to canvas page');
  }
  
  // Move blog directory to backup
  const blogDir = path.join(pagesDir, 'blog');
  const blogBackupDir = path.join(backupDir, 'blog');
  if (fs.existsSync(blogDir)) {
    fs.renameSync(blogDir, blogBackupDir);
    console.log('  📦 Excluded: blog/');
  }
  
  // List of pages to exclude
  const pagesToExclude = ['blog.astro', 'canvases.astro', 'dashboard.astro'];
  pagesToExclude.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const backupPath = path.join(backupDir, page);
    if (fs.existsSync(pagePath)) {
      fs.renameSync(pagePath, backupPath);
      console.log(`  📦 Excluded: ${page}`);
    }
  });
  
  console.log('\n✅ Canvas build preparation complete\n');
}

/**
 * Restore pages after canvas build
 */
export function restorePages() {
  console.log('\n🔄 Restoring pages...\n');
  
  // Restore home page index.astro
  const indexPath = path.join(pagesDir, 'index.astro');
  if (fs.existsSync(HOME_INDEX_BACKUP)) {
    fs.copyFileSync(HOME_INDEX_BACKUP, indexPath);
    console.log('  ↩️  Restored home page');
  }
  
  // Restore blog directory
  const blogDir = path.join(pagesDir, 'blog');
  const blogBackupDir = path.join(backupDir, 'blog');
  if (fs.existsSync(blogBackupDir)) {
    fs.renameSync(blogBackupDir, blogDir);
    console.log('  ↩️  Restored: blog/');
  }
  
  // Restore excluded pages
  const pagesToRestore = ['blog.astro', 'canvases.astro', 'dashboard.astro'];
  pagesToRestore.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const backupPath = path.join(backupDir, page);
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, pagePath);
      console.log(`  ↩️  Restored: ${page}`);
    }
  });
  
  // Clean up backup directory
  if (fs.existsSync(backupDir)) {
    const remaining = fs.readdirSync(backupDir);
    if (remaining.length === 0) {
      fs.rmdirSync(backupDir);
    }
  }
  
  console.log('\n✅ Pages restored\n');
}

// CLI usage
const command = process.argv[2];

if (command === 'prepare') {
  prepareCanvasBuild();
} else if (command === 'restore') {
  restorePages();
} else {
  console.log('Usage: node scripts/build-canvas.js [prepare|restore]');
  process.exit(1);
}
