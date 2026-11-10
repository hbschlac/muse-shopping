-- The address the shopper approved on the review screen. Its hash is part of
-- summary_hash, and every payment rail refuses to pay a store whose checkout
-- ships anywhere else. Also applied on first use by src/services/agentCheckout/schema.js.
ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS ship_to JSONB;
ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS ship_to_hash CHAR(64);
