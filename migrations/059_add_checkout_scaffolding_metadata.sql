-- Migration: Add flexible checkout scaffolding metadata
-- Stores recipient, promo, shipping selection, wallet hints, and UI scaffolding data

ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS checkout_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN checkout_sessions.checkout_metadata IS
  'Flexible checkout scaffolding metadata: recipient, billing preference, promo, shipping selections, wallet/store-connect hints';
