/**
 * Drizzle ORM Schema for Better Auth with Cloudflare D1
 * Aligned to match actual SQL migrations (0001-0006)
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  name: text('name'),
  image: text('avatar_url'), // Better Auth uses 'image', maps to 'avatar_url' column
  password: text('password_hash'), // Better Auth uses 'password', maps to 'password_hash' column
  metadata: text('metadata').default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Accounts table (for OAuth providers and email/password)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('provider_account_id').notNull(), // Better Auth uses 'accountId'
  providerId: text('provider').notNull(), // Better Auth uses 'providerId'
  password: text('password_hash'), // For email/password auth (hashed)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('expires_at', { mode: 'timestamp' }),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Verification tokens table (matches migration 0005)
export const verificationTokens = sqliteTable('verification_tokens', {
  id: text('id').primaryKey().notNull(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Canvases table (matches SQL migration with thumbnail_url, version, metadata, size_bytes, anonymous_id)
export const canvases = sqliteTable('canvases', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// Canvas versions table (matches SQL: version, no version_number, no created_by)
export const canvasVersions = sqliteTable('canvas_versions', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  r2Key: text('r2_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Canvas shares table (matches SQL: share_token, expires_at)
export const canvasShares = sqliteTable('canvas_shares', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique().notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Export schema for Drizzle
export const schema = {
  users,
  sessions,
  accounts,
  verificationTokens,
  canvases,
  canvasVersions,
  canvasShares,
};
