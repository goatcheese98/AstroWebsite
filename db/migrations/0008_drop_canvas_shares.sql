-- ============================================================================
-- Remove legacy canvas share table
-- ============================================================================
-- Share endpoints/pages were removed in the native-collaboration cleanup.
-- Keep schema aligned with runtime code by dropping old share artifacts.

DROP INDEX IF EXISTS idx_canvas_shares_token;
DROP INDEX IF EXISTS idx_canvas_shares_canvas_id;
DROP TABLE IF EXISTS canvas_shares;
