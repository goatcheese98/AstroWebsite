-- Migration: Fix verification_tokens table for Better Auth
-- Date: 2026-02-01
-- Purpose: Better Auth expects different columns for verification_tokens

-- Drop old table (data will be lost, but that's okay for verification tokens)
DROP TABLE IF EXISTS verification_tokens;

-- Create new table with correct schema for Better Auth
CREATE TABLE verification_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
