/**
 * Database Utilities
 * Helper functions for interacting with Cloudflare D1
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

// ============================================================================
// User Queries
// ============================================================================

export interface User {
  id: string;
  email: string;
  email_verified: number; // SQLite boolean (0 or 1)
  name: string | null;
  avatar_url: string | null;
  password_hash: string | null;
  created_at: number;
  updated_at: number;
}

export async function getUserById(db: D1Database, userId: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  return result;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();

  return result;
}

// ============================================================================
// Canvas Queries
// ============================================================================

export interface Canvas {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  r2_key: string;
  thumbnail_url: string | null;
  is_public: number; // SQLite boolean (0 or 1)
  version: number;
  created_at: number;
  updated_at: number;
}

export interface CreateCanvasInput {
  userId: string;
  title: string;
  description?: string;
  r2Key: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

export async function createCanvas(
  db: D1Database,
  input: CreateCanvasInput
): Promise<Canvas> {
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000); // Unix timestamp

  await db
    .prepare(
      `INSERT INTO canvases (id, user_id, title, description, r2_key, thumbnail_url, is_public, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.title,
      input.description || null,
      input.r2Key,
      input.thumbnailUrl || null,
      input.isPublic ? 1 : 0,
      now,
      now
    )
    .run();

  const canvas = await getCanvasById(db, id);
  if (!canvas) {
    throw new Error('Failed to create canvas');
  }

  return canvas;
}

export async function getCanvasById(db: D1Database, canvasId: string): Promise<Canvas | null> {
  const result = await db
    .prepare('SELECT * FROM canvases WHERE id = ?')
    .bind(canvasId)
    .first<Canvas>();

  return result;
}

export async function getCanvasByIdAndUser(
  db: D1Database,
  canvasId: string,
  userId: string
): Promise<Canvas | null> {
  const result = await db
    .prepare('SELECT * FROM canvases WHERE id = ? AND user_id = ?')
    .bind(canvasId, userId)
    .first<Canvas>();

  return result;
}

export async function getUserCanvases(
  db: D1Database,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Canvas[]> {
  const result = await db
    .prepare(
      'SELECT * FROM canvases WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?'
    )
    .bind(userId, limit, offset)
    .all<Canvas>();

  return result.results || [];
}

export async function getPublicCanvases(
  db: D1Database,
  limit: number = 20,
  offset: number = 0
): Promise<Canvas[]> {
  const result = await db
    .prepare('SELECT * FROM canvases WHERE is_public = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all<Canvas>();

  return result.results || [];
}

export interface UpdateCanvasInput {
  title?: string;
  description?: string;
  r2Key?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  version?: number;
}

export async function updateCanvas(
  db: D1Database,
  canvasId: string,
  userId: string,
  input: UpdateCanvasInput
): Promise<Canvas | null> {
  const now = Math.floor(Date.now() / 1000);

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.r2Key !== undefined) {
    updates.push('r2_key = ?');
    values.push(input.r2Key);
  }
  if (input.thumbnailUrl !== undefined) {
    updates.push('thumbnail_url = ?');
    values.push(input.thumbnailUrl);
  }
  if (input.isPublic !== undefined) {
    updates.push('is_public = ?');
    values.push(input.isPublic ? 1 : 0);
  }
  if (input.version !== undefined) {
    updates.push('version = ?');
    values.push(input.version);
  }

  if (updates.length === 0) {
    return getCanvasById(db, canvasId);
  }

  updates.push('updated_at = ?');
  values.push(now);

  // Add WHERE clause parameters
  values.push(canvasId);
  values.push(userId);

  await db
    .prepare(
      `UPDATE canvases SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    )
    .bind(...values)
    .run();

  return getCanvasById(db, canvasId);
}

export async function deleteCanvas(
  db: D1Database,
  canvasId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM canvases WHERE id = ? AND user_id = ?')
    .bind(canvasId, userId)
    .run();

  return result.meta.rows_written > 0;
}

// ============================================================================
// Canvas Version Queries
// ============================================================================

export interface CanvasVersion {
  id: string;
  canvas_id: string;
  version: number;
  r2_key: string;
  created_at: number;
}

export async function createCanvasVersion(
  db: D1Database,
  canvasId: string,
  version: number,
  r2Key: string
): Promise<CanvasVersion> {
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      'INSERT INTO canvas_versions (id, canvas_id, version, r2_key, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, canvasId, version, r2Key, now)
    .run();

  const result = await db
    .prepare('SELECT * FROM canvas_versions WHERE id = ?')
    .bind(id)
    .first<CanvasVersion>();

  if (!result) {
    throw new Error('Failed to create canvas version');
  }

  return result;
}

export async function getCanvasVersions(
  db: D1Database,
  canvasId: string
): Promise<CanvasVersion[]> {
  const result = await db
    .prepare('SELECT * FROM canvas_versions WHERE canvas_id = ? ORDER BY version DESC')
    .bind(canvasId)
    .all<CanvasVersion>();

  return result.results || [];
}

// ============================================================================
// Canvas Share Queries
// ============================================================================

export interface CanvasShare {
  id: string;
  canvas_id: string;
  share_token: string;
  expires_at: number | null;
  created_at: number;
}

export async function createCanvasShare(
  db: D1Database,
  canvasId: string,
  expiresInDays?: number
): Promise<CanvasShare> {
  const id = nanoid();
  const shareToken = nanoid(32); // Longer token for shares
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = expiresInDays
    ? now + expiresInDays * 24 * 60 * 60
    : null;

  await db
    .prepare(
      'INSERT INTO canvas_shares (id, canvas_id, share_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, canvasId, shareToken, expiresAt, now)
    .run();

  const result = await db
    .prepare('SELECT * FROM canvas_shares WHERE id = ?')
    .bind(id)
    .first<CanvasShare>();

  if (!result) {
    throw new Error('Failed to create canvas share');
  }

  return result;
}

export async function getCanvasShare(
  db: D1Database,
  shareToken: string
): Promise<CanvasShare | null> {
  const result = await db
    .prepare('SELECT * FROM canvas_shares WHERE share_token = ?')
    .bind(shareToken)
    .first<CanvasShare>();

  // Check if expired
  if (result && result.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (result.expires_at < now) {
      return null; // Expired
    }
  }

  return result;
}

export async function deleteCanvasShare(
  db: D1Database,
  shareToken: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM canvas_shares WHERE share_token = ?')
    .bind(shareToken)
    .run();

  return result.meta.rows_written > 0;
}
