-- Migration: Add updated_at column to sessions table
-- Date: 2026-02-01
-- Purpose: Better Auth expects updatedAt field in session table

ALTER TABLE sessions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());
