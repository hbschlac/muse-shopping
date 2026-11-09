-- Listing refresh (code mode): snapshots of watched items, ids already seen,
-- detected changes for alerts, run history, and per-store script overrides.
-- Same DDL as src/services/listingWatch/store.js, which also creates these on first use.
-- Design: https://claude.ai/artifact/KZCuvzhasvwGdFnuGFLb2B
◇ injected env (0) from .env // tip: ◈ encrypted .env [www.dotenvx.com]
◇ injected env (0) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
CREATE TABLE IF NOT EXISTS listing_variants (
  store_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  size TEXT,
  color TEXT,
  price_cents INTEGER,
  compare_at_cents INTEGER,
  available BOOLEAN,
  name TEXT,
  url TEXT,
  image_url TEXT,
  brand TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_key, item_id, variant_id)
);
CREATE TABLE IF NOT EXISTS listing_seen_items (
  store_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_key, item_id)
);
CREATE TABLE IF NOT EXISTS listing_changes (
  id SERIAL PRIMARY KEY,
  store_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  variant_id TEXT,
  size TEXT,
  change_type TEXT NOT NULL,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  name TEXT,
  url TEXT,
  image_url TEXT,
  brand TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_listing_changes_pending ON listing_changes (detected_at) WHERE dispatched_at IS NULL;
CREATE TABLE IF NOT EXISTS listing_runs (
  id SERIAL PRIMARY KEY,
  store_key TEXT NOT NULL,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  listing_count INTEGER,
  event_count INTEGER,
  script_name TEXT,
  script_version TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_key, run_id)
);
CREATE INDEX IF NOT EXISTS idx_listing_runs_store ON listing_runs (store_key, ran_at DESC);
CREATE TABLE IF NOT EXISTS listing_store_overrides (
  store_key TEXT PRIMARY KEY,
  script TEXT NOT NULL,
  reason TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
