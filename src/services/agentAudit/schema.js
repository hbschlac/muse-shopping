/**
 * DDL for agent_events. Same as migrations/080_create_agent_events.sql.
 * The live database only gets migrations when someone runs them by hand, so
 * agentAudit applies this once per process before its first read or write.
 * Every statement is idempotent and only adds; the triggers are created only
 * if missing, so concurrent cold starts don't race on drop/create.
 */

const SCHEMA_SQL = `
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
`;

module.exports = { SCHEMA_SQL };
