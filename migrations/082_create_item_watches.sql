-- Migration: 082_create_item_watches
-- Items a shopper is watching at partner stores (src/services/agentBridges).
--   kind 'size'  : Notify me on a sold-out size/color (or a sold-out item with no
--                  sizes). One-shot: the dispatcher turns it off after alerting.
--   kind 'price' : made when a shopper saves a partner item; alerts on price drops.
-- The listing refresh job reads active watches (listActiveWatches in
-- src/services/watches) to know which items to look up every 15 minutes.
-- The same DDL runs on first use from src/services/watches/index.js, so this
-- file is the record; no manual migration run is needed.

CREATE TABLE IF NOT EXISTS item_watches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_key TEXT NOT NULL,                 -- partner key from agentBridges/partners.json
  item_id TEXT NOT NULL,                   -- the store's (UCP) product id
  variant_id TEXT,                         -- null = the whole item
  size TEXT,
  color TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('size', 'price')),
  active BOOLEAN NOT NULL DEFAULT true,
  -- Shown on the shopper's watch list only; alerts use listing_changes.
  title TEXT,
  image_url TEXT,
  price_cents INTEGER,                     -- price when the watch was made
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One watch per shopper, item, variant and kind; watching again reactivates it.
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_watches_unique
  ON item_watches (user_id, store_key, item_id, COALESCE(variant_id, ''), kind);

CREATE INDEX IF NOT EXISTS idx_item_watches_active_item
  ON item_watches (store_key, item_id) WHERE active;
