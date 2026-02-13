/**
 * Drizzle ORM Schema for AstroWeb
 * Adjusted for Clerk Authentication (Foreign keys to users table removed)
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Canvases table
export const canvases = sqliteTable('canvases', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull(), // Clerk User ID (no FK constraint)
  title: text('title').notNull(),
  description: text('description'),
  r2Key: text('r2_key').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
  version: integer('version').default(1).notNull(),
  metadata: text('metadata').default('{}'),
  sizeBytes: integer('size_bytes').default(0),
  anonymousId: text('anonymous_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Canvas versions table
export const canvasVersions = sqliteTable('canvas_versions', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  r2Key: text('r2_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Canvas shares table
export const canvasShares = sqliteTable('canvas_shares', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique().notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Export schema for Drizzle
export const schema = {
  canvases,
  canvasVersions,
  canvasShares,
};
