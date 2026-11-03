-- Checkout intents: what the shopper approved in the one confirm step.
-- Keep in sync with src/services/agentCheckout/schema.js (applied on first use).
-- No card data: no card numbers, network tokens, cryptograms or Shop Tokens.

CREATE TABLE IF NOT EXISTS checkout_intents (
  id VARCHAR(64) PRIMARY KEY,                 -- ci_<uuid>
  user_id INTEGER NOT NULL,
  cart_session_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, paying, done, cancelled, expired
  total_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  summary_hash CHAR(64) NOT NULL,              -- what the shopper saw on the review screen
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_checkout_intents_user ON checkout_intents (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS checkout_intent_stores (
  id SERIAL PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL REFERENCES checkout_intents(id) ON DELETE CASCADE,
  partner_key VARCHAR(100) NOT NULL,
  store_name VARCHAR(255),
  rail VARCHAR(50) NOT NULL,                   -- shop_pay, visa_ic, stripe_spt, handoff
  rail_reason TEXT,
  checkout_id TEXT,
  continue_url TEXT,
  item_count INTEGER,
  quoted_cents INTEGER,
  ceiling_cents INTEGER,                       -- most the shopper approved for this store
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, failed, blocked, handoff
  order_id TEXT,
  error TEXT,
  UNIQUE (intent_id, partner_key)
);
