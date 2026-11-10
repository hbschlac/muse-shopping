-- Listing refresh: the daily trial of a store's own script while it is on the
-- no-AI fallback. Same DDL as src/services/listingWatch/store.js, which also
-- applies it on first use.
ALTER TABLE listing_store_overrides ADD COLUMN IF NOT EXISTS last_trial_at TIMESTAMPTZ;
ALTER TABLE listing_store_overrides ADD COLUMN IF NOT EXISTS last_trial_error TEXT;
