-- Migration: 080_create_agent_events
-- Backend log of every action and decision Muse's agent makes for a shopper
-- (product checks, store checkouts, shipping fill, payment rail choice,
-- shopper approvals, payments, refusals). Kept for accountability and fraud
-- review. Written only through src/services/agentAudit.
--
-- Rules the table enforces:
--   - Append-only: UPDATE and DELETE raise an error, so rows can't be edited
--     or removed after the fact.
--   - Tamper-evident: each row stores the SHA-256 of its own content plus the
--     previous row's hash. AgentAudit.verifyChain() recomputes the chain.
--   - No card data: card numbers, CVVs, network tokens, cryptograms and
--     passkey assertions are redacted before insert (see redact() in the
--     service). Only last four digits and Muse's own ids are kept.
--
-- user_id is a plain integer, not a foreign key, so deleting a user account
-- doesn't cascade into (and get blocked by) the append-only log.

CREATE TABLE IF NOT EXISTS agent_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  cart_session_id VARCHAR(100),       -- one shopping session (cart checkout)
  checkout_intent_id VARCHAR(100),    -- the approved purchase intent, once there is one
  actor VARCHAR(100) NOT NULL,        -- 'muse-agent', 'shopper', 'system', 'store:<partner key>', 'network:visa'
  action VARCHAR(100) NOT NULL,       -- e.g. 'product.checked', 'checkout.created', 'payment.completed'
  decision VARCHAR(30) NOT NULL,      -- 'info', 'allowed', 'blocked', 'approved', 'declined', 'error'
  reason TEXT,                        -- why the agent decided this, in plain words
  partner_key VARCHAR(100),           -- store, when the event concerns one
  rail VARCHAR(50),                   -- 'shop_pay', 'visa_ic', 'stripe_spt', 'handoff', ...
  amount_cents INTEGER,
  currency VARCHAR(3),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,  -- redacted request/response context
  request_id VARCHAR(100),
  prev_hash CHAR(64),
  hash CHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_agent_events_user ON agent_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_session ON agent_events (cart_session_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_events_intent ON agent_events (checkout_intent_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_events_decision ON agent_events (decision, occurred_at DESC)
  WHERE decision IN ('blocked', 'declined', 'error');

CREATE OR REPLACE FUNCTION agent_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'agent_events is append-only (% not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_events_no_update ON agent_events;
CREATE TRIGGER agent_events_no_update
  BEFORE UPDATE OR DELETE ON agent_events
  FOR EACH ROW EXECUTE FUNCTION agent_events_append_only();

DROP TRIGGER IF EXISTS agent_events_no_truncate ON agent_events;
CREATE TRIGGER agent_events_no_truncate
  BEFORE TRUNCATE ON agent_events
  FOR EACH STATEMENT EXECUTE FUNCTION agent_events_append_only();
