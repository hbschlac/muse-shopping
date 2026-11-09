/**
 * Item watches: what a shopper wants to hear about at partner stores.
 *
 *   kind 'size'  : the Notify me button on a sold-out size/color (or a sold-out
 *                  item with no sizes). One-shot: once the alert goes out, the
 *                  dispatcher calls deactivateWatch so it doesn't fire again.
 *   kind 'price' : saving a partner item. Price drops alert once per item, not
 *                  per size, so a price watch never has a variant.
 *
 * Who reads this:
 *   - the listing refresh job calls listActiveWatches() to know which items to
 *     look up every 15 minutes (Shopify's Catalog rules: look up watched items,
 *     no bulk crawl);
 *   - the alert dispatcher calls findWatchesForChange(change) for each
 *     listing_changes row, then deactivateWatch(id) after a size alert.
 *
 * Table: item_watches (migrations/082_create_item_watches.sql). The table is
 * created on first use, like newArrivalsService, so nobody has to run
 * migrations by hand.
 */

const pool = require('../../db/pool');
const logger = require('../../utils/logger');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const AgentBridges = require('../agentBridges');

const KINDS = ['size', 'price'];
const MAX_TEXT = 500;
const MAX_URL = 2000;
const MAX_ACTIVE_PER_USER = 500;

// Same DDL as migrations/082_create_item_watches.sql. Every statement is
// idempotent and only adds.
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS item_watches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_key TEXT NOT NULL,
    item_id TEXT NOT NULL,
    variant_id TEXT,
    size TEXT,
    color TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('size', 'price')),
    active BOOLEAN NOT NULL DEFAULT true,
    title TEXT,
    image_url TEXT,
    price_cents INTEGER,
    currency TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_item_watches_unique
    ON item_watches (user_id, store_key, item_id, COALESCE(variant_id, ''), kind);
  CREATE INDEX IF NOT EXISTS idx_item_watches_active_item
    ON item_watches (store_key, item_id) WHERE active;
`;

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).catch(err => {
      schemaReady = null; // try again next time
      logger.warn(`Item watches: schema setup failed: ${err.message}`);
    });
  }
  return schemaReady;
}

// For tests.
function resetSchemaForTests() {
  schemaReady = null;
}

function cleanText(value, max = MAX_TEXT) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function cleanUrl(value) {
  const s = cleanText(value, MAX_URL);
  return s && /^https:\/\//i.test(s) ? s : null;
}

function cleanCents(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < 100000000 ? n : null;
}

const COLUMNS = `id, user_id, store_key, item_id, variant_id, size, color, kind, active,
  title, image_url, price_cents, currency, created_at, updated_at`;

function toWatch(row) {
  return {
    id: row.id,
    storeKey: row.store_key,
    itemId: row.item_id,
    variantId: row.variant_id,
    size: row.size,
    color: row.color,
    kind: row.kind,
    active: row.active,
    title: row.title,
    imageUrl: row.image_url,
    priceCents: row.price_cents,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

/**
 * Start (or restart) watching an item.
 * input: { storeKey, itemId, kind, variantId?, size?, color?, title?, imageUrl?, priceCents?, currency? }
 */
async function createWatch(userId, input = {}) {
  if (!userId) throw new ValidationError('Sign in to watch items');
  const kind = cleanText(input.kind);
  if (!KINDS.includes(kind)) throw new ValidationError('kind must be "size" or "price"');

  const storeKey = cleanText(input.storeKey, 100);
  const itemId = cleanText(input.itemId);
  if (!storeKey || !itemId) throw new ValidationError('storeKey and itemId are required');
  AgentBridges.getPartner(storeKey); // throws NotFoundError for an unknown store

  // A price drop alerts once per item, so price watches never pin a variant.
  const variantId = kind === 'price' ? null : cleanText(input.variantId);
  const size = kind === 'price' ? null : cleanText(input.size, 100);
  const color = kind === 'price' ? null : cleanText(input.color, 100);

  await ensureSchema();

  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM item_watches WHERE user_id = $1 AND active',
    [userId]
  );
  if ((countRows[0]?.n || 0) >= MAX_ACTIVE_PER_USER) {
    throw new ValidationError(`You can watch up to ${MAX_ACTIVE_PER_USER} items. Remove some first.`);
  }

  const { rows } = await pool.query(
    `INSERT INTO item_watches
       (user_id, store_key, item_id, variant_id, size, color, kind, title, image_url, price_cents, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id, store_key, item_id, (COALESCE(variant_id, '')), kind)
     DO UPDATE SET active = true,
                   size = EXCLUDED.size,
                   color = EXCLUDED.color,
                   title = COALESCE(EXCLUDED.title, item_watches.title),
                   image_url = COALESCE(EXCLUDED.image_url, item_watches.image_url),
                   price_cents = COALESCE(EXCLUDED.price_cents, item_watches.price_cents),
                   currency = COALESCE(EXCLUDED.currency, item_watches.currency),
                   updated_at = now()
     RETURNING ${COLUMNS}`,
    [
      userId, storeKey, itemId, variantId, size, color, kind,
      cleanText(input.title), cleanUrl(input.imageUrl), cleanCents(input.priceCents),
      cleanText(input.currency, 3),
    ]
  );
  return toWatch(rows[0]);
}

/** A shopper's active watches, newest first. Optional filter by store and item. */
async function listWatches(userId, { storeKey = null, itemId = null } = {}) {
  await ensureSchema();
  const params = [userId];
  let where = 'user_id = $1 AND active';
  if (storeKey) { params.push(storeKey); where += ` AND store_key = $${params.length}`; }
  if (itemId) { params.push(itemId); where += ` AND item_id = $${params.length}`; }
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM item_watches WHERE ${where} ORDER BY created_at DESC LIMIT ${MAX_ACTIVE_PER_USER}`,
    params
  );
  return rows.map(toWatch);
}

/** Stop a watch. Only the shopper who owns it can. Kept as a row (active = false). */
async function removeWatch(userId, watchId) {
  const id = Number(watchId);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid watch id');
  await ensureSchema();
  const { rows } = await pool.query(
    `UPDATE item_watches SET active = false, updated_at = now()
     WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  if (!rows.length) throw new NotFoundError('Watch');
  return { id, removed: true };
}

/**
 * Every item someone is watching, deduplicated: [{ store_key, item_id, variant_id }].
 * The listing refresh job looks these up each cycle. Fails soft to [] so a
 * missing table never stops a refresh.
 */
async function listActiveWatches() {
  try {
    await ensureSchema();
    const { rows } = await pool.query(
      `SELECT DISTINCT store_key, item_id, variant_id
       FROM item_watches WHERE active
       ORDER BY store_key, item_id, variant_id NULLS FIRST`
    );
    return rows.map(r => ({ store_key: r.store_key, item_id: r.item_id, variant_id: r.variant_id }));
  } catch (err) {
    logger.warn(`Item watches: listActiveWatches failed: ${err.message}`);
    return [];
  }
}

/**
 * Active watches a listing_changes row should alert, with the shopper's user_id.
 *   back_in_stock -> size watches on that item whose variant matches (or whose
 *                    size matches when the change has no variant id, or that
 *                    watch the whole item)
 *   price_change  -> price watches on that item
 *   new_item      -> none (new drops come from followed stores, not watches)
 */
async function findWatchesForChange(change = {}) {
  const storeKey = change.store_key;
  const itemId = change.item_id;
  if (!storeKey || !itemId) return [];

  let kindSql;
  const params = [storeKey, itemId];
  if (change.change_type === 'price_change') {
    kindSql = "kind = 'price'";
  } else if (change.change_type === 'back_in_stock') {
    params.push(change.variant_id || null, change.size || null);
    kindSql = `kind = 'size' AND (
      variant_id IS NULL
      OR ($3::text IS NOT NULL AND variant_id = $3::text)
      OR ($3::text IS NULL AND $4::text IS NOT NULL AND LOWER(size) = LOWER($4::text))
    )`;
  } else {
    return [];
  }

  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM item_watches
     WHERE active AND store_key = $1 AND item_id = $2 AND ${kindSql}`,
    params
  );
  return rows.map(r => ({ ...toWatch(r), userId: r.user_id }));
}

/** Turn a watch off after its one-shot alert (size watches). */
async function deactivateWatch(watchId) {
  await ensureSchema();
  await pool.query(
    'UPDATE item_watches SET active = false, updated_at = now() WHERE id = $1',
    [watchId]
  );
}

module.exports = {
  KINDS,
  ensureSchema,
  createWatch,
  listWatches,
  removeWatch,
  listActiveWatches,
  findWatchesForChange,
  deactivateWatch,
  _resetSchemaForTests: resetSchemaForTests,
};
