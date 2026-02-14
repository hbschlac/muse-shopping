-- Migration: Add payment_methods column for per-store retailer payment methods
-- For retailer-MOR checkout, each store needs its own payment method token

ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}';

COMMENT ON COLUMN checkout_sessions.payment_methods IS 'Per-store retailer payment method tokens: { "storeId": "paymentMethodToken" }';
