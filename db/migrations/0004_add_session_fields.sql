-- Migration: Add missing fields to sessions table
-- Date: 2026-02-01
-- Purpose: Better Auth expects ipAddress and userAgent fields

ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
