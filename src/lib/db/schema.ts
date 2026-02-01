/**
 * Drizzle ORM Schema for Better Auth with Cloudflare D1
 * This schema matches the tables created in db/migrations/0001_initial_schema.sql
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Users table
// IMPORTANT: Use camelCase for TypeScript property names, Drizzle maps to snake_case columns
export const users = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  name: text('name'),
  image: text('avatar_url'), // Better Auth uses 'image', maps to 'avatar_url' column
  password: text('password_hash'), // Better Auth uses 'password', maps to 'password_hash' column
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'), // Better Auth expects this
  userAgent: text('user_agent'), // Better Auth expects this
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
  accessTokenExpiresAt: integer('expires_at', { mode: 'timestamp' }), // Better Auth uses 'accessTokenExpiresAt'
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Verification tokens table
export const verificationTokens = sqliteTable('verification_tokens', {
  id: text('id').primaryKey().notNull(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Canvases table (for Excalidraw canvases)
export const canvases = sqliteTable('canvases', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  r2Key: text('r2_key').unique().notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Canvas versions table (for version history)
export const canvasVersions = sqliteTable('canvas_versions', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  r2Key: text('r2_key').unique().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
});

// Canvas shares table (for sharing canvases)
export const canvasShares = sqliteTable('canvas_shares', {
  id: text('id').primaryKey().notNull(),
  canvasId: text('canvas_id').notNull().references(() => canvases.id, { onDelete: 'cascade' }),
  sharedWith: text('shared_with').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission: text('permission').notNull(), // 'view' or 'edit'
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
