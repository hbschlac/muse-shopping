-- Tripwire: when Muse blocks a payment (over the approved amount, a different
-- ship-to, or a confirm that doesn't match the review), agent checkout pauses for
-- that shopper until hannah clears the hold. Also applied on first use by
-- src/services/agentCheckout/schema.js. See docs/ROGUE_AGENT.md.
CREATE TABLE IF NOT EXISTS agent_checkout_holds (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  checkout_intent_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cleared_at TIMESTAMPTZ,
  cleared_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_checkout_holds_open ON agent_checkout_holds (user_id) WHERE cleared_at IS NULL;
