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
--
-- Keep in sync with src/services/agentAudit/schema.js, which applies this on
-- first use because production migrations are run by hand.

CREATE TABLE IF NOT EXISTS agent_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  cart_session_id VARCHAR(100),
  checkout_intent_id VARCHAR(100),
  actor VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  decision VARCHAR(30) NOT NULL,
  reason TEXT,
  partner_key VARCHAR(100),
  rail VARCHAR(50),
  amount_cents INTEGER,
  currency VARCHAR(3),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id VARCHAR(100),
  prev_hash CHAR(64),
  hash CHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_agent_events_user ON agent_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_session ON agent_events (cart_session_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_events_intent ON agent_events (checkout_intent_id, id);
CREATE INDEX IF NOT EXISTS idx_agent_events_decision ON agent_events (decision, occurred_at DESC)
  WHERE decision IN ('blocked', 'declined', 'error');

CREATE OR REPLACE FUNCTION agent_events_append_only() RETURNS trigger AS $fn$
BEGIN
  RAISE EXCEPTION 'agent_events is append-only (% not allowed)', TG_OP;
END;
$fn$ LANGUAGE plpgsql;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'agent_events_no_update') THEN
    CREATE TRIGGER agent_events_no_update
      BEFORE UPDATE OR DELETE ON agent_events
      FOR EACH ROW EXECUTE FUNCTION agent_events_append_only();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'agent_events_no_truncate') THEN
    CREATE TRIGGER agent_events_no_truncate
      BEFORE TRUNCATE ON agent_events
      FOR EACH STATEMENT EXECUTE FUNCTION agent_events_append_only();
  END IF;
END
$do$;
