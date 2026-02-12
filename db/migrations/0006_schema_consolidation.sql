-- Migration: Schema consolidation - add metadata columns
-- Date: 2026-02-12
-- Purpose: Add flexible JSON metadata to users and canvases,
--          size tracking, and anonymous canvas support

ALTER TABLE users ADD COLUMN metadata TEXT DEFAULT '{}';
ALTER TABLE canvases ADD COLUMN metadata TEXT DEFAULT '{}';
ALTER TABLE canvases ADD COLUMN size_bytes INTEGER DEFAULT 0;
ALTER TABLE canvases ADD COLUMN anonymous_id TEXT;
CREATE INDEX IF NOT EXISTS idx_canvases_anonymous_id ON canvases(anonymous_id);
