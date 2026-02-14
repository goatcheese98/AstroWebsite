-- Migration: Cleanup Auth and Remove Users FK
-- Date: 2026-02-13
-- Purpose: Remove legacy auth tables (users, sessions, accounts, verification_tokens)
--          and remove the foreign key constraint from canvases table to users table
--          to support Clerk authentication (where user IDs are strings not present in local DB).

PRAGMA foreign_keys=OFF;

-- 1. Create new canvases table without foreign key and with all columns
CREATE TABLE new_canvases (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  r2_key TEXT NOT NULL,
  thumbnail_url TEXT,
  is_public INTEGER DEFAULT 0 NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT DEFAULT '{}',
  size_bytes INTEGER,
  anonymous_id TEXT
);

-- 2. Copy data from old table
-- Note: Excluding size_bytes as it does not exist in the source table
INSERT INTO new_canvases (
  id, user_id, title, description, r2_key, thumbnail_url, is_public, version, 
  created_at, updated_at, metadata, anonymous_id
)
SELECT 
  id, user_id, title, description, r2_key, thumbnail_url, is_public, version, 
  created_at, updated_at, metadata, anonymous_id 
FROM canvases;

-- 3. Drop old tables
DROP TABLE canvases;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS verification_tokens;

-- 4. Rename new table to original name
ALTER TABLE new_canvases RENAME TO canvases;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_is_public ON canvases(is_public);
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_anonymous_id ON canvases(anonymous_id);

PRAGMA foreign_keys=ON;
