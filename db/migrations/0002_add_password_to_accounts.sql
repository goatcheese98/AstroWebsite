-- Migration: Add password_hash column to accounts table
-- Date: 2026-02-01
-- Purpose: Better Auth stores password hashes in the accounts table for email/password authentication

ALTER TABLE accounts ADD COLUMN password_hash TEXT;
