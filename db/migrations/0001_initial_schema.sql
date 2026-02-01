-- Initial Database Schema for AstroWeb
-- Created: 2026-01-31

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0 NOT NULL, -- SQLite uses 0/1 for boolean
  name TEXT,
  avatar_url TEXT,
  password_hash TEXT, -- For email/password auth
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), -- Unix timestamp
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL, -- Unix timestamp
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- Accounts Table (for OAuth providers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'github', etc.
  provider_account_id TEXT NOT NULL, -- ID from the provider
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_account_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);

-- ============================================================================
-- Verification Tokens Table (for email verification, password reset)
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'email_verification', 'password_reset'
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);

-- ============================================================================
-- Canvases Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  r2_key TEXT NOT NULL, -- Path to canvas JSON in R2 storage
  thumbnail_url TEXT,
  is_public INTEGER DEFAULT 0 NOT NULL, -- 0 = private, 1 = public
  version INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_is_public ON canvases(is_public);
CREATE INDEX IF NOT EXISTS idx_canvases_created_at ON canvases(created_at DESC);

-- ============================================================================
-- Canvas Versions Table (for version history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canvas_versions (
  id TEXT PRIMARY KEY NOT NULL,
  canvas_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  r2_key TEXT NOT NULL, -- Path to versioned canvas JSON in R2
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
  UNIQUE(canvas_id, version)
);

-- Index for faster version lookups
CREATE INDEX IF NOT EXISTS idx_canvas_versions_canvas_id ON canvas_versions(canvas_id);

-- ============================================================================
-- Canvas Shares Table (for public sharing links)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canvas_shares (
  id TEXT PRIMARY KEY NOT NULL,
  canvas_id TEXT NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  expires_at INTEGER, -- NULL = never expires
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
);

-- Index for faster share token lookups
CREATE INDEX IF NOT EXISTS idx_canvas_shares_token ON canvas_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_canvas_shares_canvas_id ON canvas_shares(canvas_id);
