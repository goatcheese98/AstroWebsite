/**
 * Drizzle ORM Schema for Better Auth with Cloudflare D1
 * This schema matches the tables created in db/migrations/0001_initial_schema.sql
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  name: text('name'),
  image: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').unique().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Accounts table (for OAuth providers)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  password: text('password'),
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
