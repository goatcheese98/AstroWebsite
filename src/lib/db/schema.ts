/**
 * Drizzle ORM Schema for AstroWeb
 * Adjusted for Clerk Authentication (Foreign keys to users table removed)
 *
 * IMPORTANT: Timestamps are stored as Unix timestamps (seconds, not milliseconds)
 * Do NOT use { mode: 'timestamp' } as it expects milliseconds
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
  metadata: text('metadata'), // JSON string, nullable
  sizeBytes: integer('size_bytes'), // Nullable
  anonymousId: text('anonymous_id'), // For anonymous canvas migration
  createdAt: integer('created_at').notNull(), // Unix timestamp (seconds)
  updatedAt: integer('updated_at').notNull(), // Unix timestamp (seconds)
});

// Canvas versions table
export const canvasVersions = sqliteTable('canvas_versions', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  r2Key: text('r2_key').notNull(),
  createdAt: integer('created_at').notNull(), // Unix timestamp (seconds)
});

// Canvas shares table
export const canvasShares = sqliteTable('canvas_shares', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique().notNull(),
  expiresAt: integer('expires_at'), // Unix timestamp (seconds), nullable
  createdAt: integer('created_at').notNull(), // Unix timestamp (seconds)
});

// Export schema for Drizzle
export const schema = {
  canvases,
  canvasVersions,
  canvasShares,
};

// Export types inferred from schema
export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;
export type CanvasVersion = typeof canvasVersions.$inferSelect;
export type NewCanvasVersion = typeof canvasVersions.$inferInsert;
export type CanvasShare = typeof canvasShares.$inferSelect;
export type NewCanvasShare = typeof canvasShares.$inferInsert;
