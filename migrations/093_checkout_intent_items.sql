-- The exact items the shopper approved at each store: product and variant ids,
-- name, size, color, quantity, cart and store prices, and on a marketplace the
-- seller, who fulfils it, and the listing (offer) id. No card data.
-- Also applied on first use by src/services/agentCheckout/schema.js.

ALTER TABLE checkout_intent_stores ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
