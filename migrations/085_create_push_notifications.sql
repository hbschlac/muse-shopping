-- Migration: 085_create_push_notifications
-- Push alerts on the home-screen website (R7), notification settings (R8) and
-- alert history (R9).
--   push_subscriptions: one row per device that turned on push (Web Push endpoint + keys).
--   notification_prefs: one row per shopper; missing row = defaults.
--   alert_log: every alert Muse would send, sent or not, with opened/dismissed/"fewer like this".
-- user_id is a plain integer (no foreign key), like agent_events.
--
-- Keep in sync with src/services/notifications/schema.js, which applies this on
-- first use because production migrations are run by hand.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id INTEGER PRIMARY KEY,
  types JSONB NOT NULL DEFAULT '{}'::jsonb,
  muted JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiet_start TEXT NOT NULL DEFAULT '22:00',
  quiet_end TEXT NOT NULL DEFAULT '08:00',
  digest_time TEXT NOT NULL DEFAULT '19:00',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  daily_cap INTEGER NOT NULL DEFAULT 5,
  price_drop_pct INTEGER NOT NULL DEFAULT 15,
  last_digest_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  change_id INTEGER,
  alert_type TEXT NOT NULL,
  store_key TEXT,
  item_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  image_url TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  send_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  digested_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  fewer_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_log_user_change
  ON alert_log (user_id, change_id) WHERE change_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_log_user_created ON alert_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_status ON alert_log (status, send_after);
