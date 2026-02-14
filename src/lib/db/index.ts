/**
 * Database Utilities
 * Helper functions for interacting with Cloudflare D1 using Drizzle ORM
 */

import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  canvases,
  canvasVersions,
  canvasShares,
  type Canvas,
  type NewCanvas,
  type CanvasVersion,
  type NewCanvasVersion,
  type CanvasShare,
  type NewCanvasShare,
} from './schema';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a Drizzle ORM client from a D1 database
 */
export function createDbClient(d1: D1Database) {
  return drizzle(d1);
}

// ============================================================================
// Canvas Queries
// ============================================================================

// Export Canvas type from schema (for backward compatibility with existing code)
export type { Canvas };

export interface CreateCanvasInput {
  id?: string; // Optional: if not provided, will generate one
  userId: string;
  title: string;
  description?: string;
  r2Key: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  metadata?: string; // JSON string
  sizeBytes?: number;
  anonymousId?: string;
}

export async function createCanvas(
  db: D1Database,
  input: CreateCanvasInput
): Promise<Canvas> {
  const drizzleDb = createDbClient(db);

  // Use provided ID or generate a new one
  const id = input.id || nanoid();
  const now = Math.floor(Date.now() / 1000); // Unix timestamp

  const newCanvas: NewCanvas = {
    id,
    userId: input.userId,
    title: input.title,
    description: input.description ?? null,
    r2Key: input.r2Key,
    thumbnailUrl: input.thumbnailUrl ?? null,
    isPublic: input.isPublic ?? false,
    version: 1,
    metadata: input.metadata ?? null,
    sizeBytes: input.sizeBytes ?? null,
    anonymousId: input.anonymousId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await drizzleDb.insert(canvases).values(newCanvas).run();

  const canvas = await getCanvasById(db, id);
  if (!canvas) {
    throw new Error('Failed to create canvas');
  }

  return canvas;
}

export async function getCanvasById(db: D1Database, canvasId: string): Promise<Canvas | null> {
  const drizzleDb = createDbClient(db);

  const result = await drizzleDb
    .select()
    .from(canvases)
    .where(eq(canvases.id, canvasId))
    .get();

  return result ?? null;
}

export async function getCanvasByIdAndUser(
  db: D1Database,
  canvasId: string,
  userId: string
): Promise<Canvas | null> {
  const drizzleDb = createDbClient(db);

  const result = await drizzleDb
    .select()
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .get();

  return result ?? null;
}

export async function getUserCanvases(
  db: D1Database,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Canvas[]> {
  const drizzleDb = createDbClient(db);

  const results = await drizzleDb
    .select()
    .from(canvases)
    .where(eq(canvases.userId, userId))
    .orderBy(desc(canvases.updatedAt))
    .limit(limit)
    .offset(offset)
    .all();

  return results;
}

export async function getPublicCanvases(
  db: D1Database,
  limit: number = 20,
  offset: number = 0
): Promise<Canvas[]> {
  const drizzleDb = createDbClient(db);

  const results = await drizzleDb
    .select()
    .from(canvases)
    .where(eq(canvases.isPublic, true))
    .orderBy(desc(canvases.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return results;
}

export interface UpdateCanvasInput {
  title?: string;
  description?: string | null;
  r2Key?: string;
  thumbnailUrl?: string | null;
  isPublic?: boolean;
  version?: number;
  metadata?: string | null;
  sizeBytes?: number | null;
}

export async function updateCanvas(
  db: D1Database,
  canvasId: string,
  userId: string,
  input: UpdateCanvasInput
): Promise<Canvas | null> {
  const drizzleDb = createDbClient(db);
  const now = Math.floor(Date.now() / 1000);

  // If no updates, just return existing canvas
  if (Object.keys(input).length === 0) {
    return getCanvasById(db, canvasId);
  }

  // Drizzle handles dynamic updates automatically
  await drizzleDb
    .update(canvases)
    .set({
      ...input,
      updatedAt: now,
    })
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .run();

  return getCanvasById(db, canvasId);
}

export async function deleteCanvas(
  db: D1Database,
  canvasId: string,
  userId: string
): Promise<boolean> {
  const drizzleDb = createDbClient(db);

  const result = await drizzleDb
    .delete(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .run();

  return (result.meta?.rows_written ?? 0) > 0;
}

// ============================================================================
// Canvas Version Queries
// ============================================================================

// Export CanvasVersion type from schema (for backward compatibility)
export type { CanvasVersion };

export async function createCanvasVersion(
  db: D1Database,
  canvasId: string,
  version: number,
  r2Key: string
): Promise<CanvasVersion> {
  const drizzleDb = createDbClient(db);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  const newVersion: NewCanvasVersion = {
    id,
    canvasId,
    version,
    r2Key,
    createdAt: now,
  };

  await drizzleDb.insert(canvasVersions).values(newVersion).run();

  const result = await drizzleDb
    .select()
    .from(canvasVersions)
    .where(eq(canvasVersions.id, id))
    .get();

  if (!result) {
    throw new Error('Failed to create canvas version');
  }

  return result;
}

export async function getCanvasVersions(
  db: D1Database,
  canvasId: string
): Promise<CanvasVersion[]> {
  const drizzleDb = createDbClient(db);

  const results = await drizzleDb
    .select()
    .from(canvasVersions)
    .where(eq(canvasVersions.canvasId, canvasId))
    .orderBy(desc(canvasVersions.version))
    .all();

  return results;
}

// ============================================================================
// Canvas Share Queries
// ============================================================================

// Export CanvasShare type from schema (for backward compatibility)
export type { CanvasShare };

export async function createCanvasShare(
  db: D1Database,
  canvasId: string,
  expiresInDays?: number
): Promise<CanvasShare> {
  const drizzleDb = createDbClient(db);
  const id = nanoid();
  const shareToken = nanoid(32); // Longer token for shares
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = expiresInDays ? now + expiresInDays * 24 * 60 * 60 : null;

  const newShare: NewCanvasShare = {
    id,
    canvasId,
    shareToken,
    expiresAt,
    createdAt: now,
  };

  await drizzleDb.insert(canvasShares).values(newShare).run();

  const result = await drizzleDb
    .select()
    .from(canvasShares)
    .where(eq(canvasShares.id, id))
    .get();

  if (!result) {
    throw new Error('Failed to create canvas share');
  }

  return result;
}

export async function getCanvasShare(
  db: D1Database,
  shareToken: string
): Promise<CanvasShare | null> {
  const drizzleDb = createDbClient(db);

  const result = await drizzleDb
    .select()
    .from(canvasShares)
    .where(eq(canvasShares.shareToken, shareToken))
    .get();

  if (!result) {
    return null;
  }

  // Check if expired
  if (result.expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    if (result.expiresAt < now) {
      return null; // Expired
    }
  }

  return result;
}

export async function deleteCanvasShare(
  db: D1Database,
  shareToken: string
): Promise<boolean> {
  const drizzleDb = createDbClient(db);

  const result = await drizzleDb
    .delete(canvasShares)
    .where(eq(canvasShares.shareToken, shareToken))
    .run();

  return (result.meta?.rows_written ?? 0) > 0;
}
