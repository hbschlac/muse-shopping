/**
 * Database side of listing refresh.
 *
 * Tables (same DDL as migrations/090_create_listing_watch.sql). They are created
 * on first use so production gets them without anyone running a migration.
 * Every statement only adds and is safe to repeat.
 *
 *   listing_variants        latest price and stock per size, WATCHED items only,
 *                           overwritten every run (Shopify allows 15 minutes)
 *   listing_seen_items      item ids and first-seen dates, for "new item"
 *   listing_changes         what changed; the push alerts work reads and
 *                           dispatches these (it owns dispatched_at)
 *   listing_runs            one row per store per run: healthy, broken or held
 *   listing_store_overrides a different script for a store (set by the repair
 *                           work, e.g. the no-AI fallback)
 */

const pool = require('../../db/pool');
const logger = require('../../utils/logger');

const SCHEMA_SQL = `
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
`;

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).catch(err => {
      schemaReady = null;
      logger.warn(`listingWatch: schema setup failed: ${err.message}`);
      throw err;
    });
  }
  return schemaReady;
}

async function loadState(storeKey) {
  await ensureSchema();
  const [variants, seen, runs] = await Promise.all([
    pool.query('SELECT item_id, variant_id, price_cents, available FROM listing_variants WHERE store_key = $1', [storeKey]),
    pool.query('SELECT item_id FROM listing_seen_items WHERE store_key = $1', [storeKey]),
    pool.query(`SELECT run_id, status, listing_count, script_version FROM listing_runs
                WHERE store_key = $1 ORDER BY ran_at DESC LIMIT 10`, [storeKey]),
  ]);
  const lastSaved = runs.rows.find(r => r.status === 'ok' || r.status === 'baseline');
  return {
    variants: variants.rows,
    seenItemIds: new Set(seen.rows.map(r => r.item_id)),
    lastScriptVersion: lastSaved ? lastSaved.script_version : null,
    lastGoodCount: lastSaved ? lastSaved.listing_count : null,
    lastStatus: runs.rows[0] ? runs.rows[0].status : null,
    runIds: new Set(runs.rows.map(r => r.run_id)),
  };
}

async function recordRun(storeKey, { runId, status, reason = null, listingCount = null, eventCount = null, scriptName = null, scriptVersion = null }) {
  await ensureSchema();
  await pool.query(`
    INSERT INTO listing_runs (store_key, run_id, status, reason, listing_count, event_count, script_name, script_version)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (store_key, run_id) DO NOTHING
  `, [storeKey, runId, status, reason ? String(reason).slice(0, 500) : null, listingCount, eventCount, scriptName, scriptVersion]);
}

/**
 * Save one healthy run in a single transaction: watched sizes, seen ids,
 * missing watched items marked sold out, and the changes.
 */
async function saveRun(storeKey, { listings, variantRows, missingWatchedIds, watchedItemIds, events }) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = listings.map(l => l.itemId);
    if (ids.length) {
      await client.query(`
        INSERT INTO listing_seen_items (store_key, item_id)
        SELECT $1::text, unnest($2::text[])
        ON CONFLICT DO NOTHING
      `, [storeKey, ids]);
    }

    if (variantRows.length) {
      const col = f => variantRows.map(f);
      await client.query(`
        INSERT INTO listing_variants
          (store_key, item_id, variant_id, size, color, price_cents, compare_at_cents, available, name, url, image_url, brand, last_seen_at)
        SELECT $1::text, t.item_id, t.variant_id, t.size, t.color, t.price_cents, t.compare_at_cents,
               t.available, t.name, t.url, t.image_url, t.brand, now()
        FROM unnest(
          $2::text[], $3::text[], $4::text[], $5::text[], $6::int[], $7::int[], $8::bool[],
          $9::text[], $10::text[], $11::text[], $12::text[])
          AS t(item_id, variant_id, size, color, price_cents, compare_at_cents, available, name, url, image_url, brand)
        ON CONFLICT (store_key, item_id, variant_id) DO UPDATE SET
          size = EXCLUDED.size, color = EXCLUDED.color,
          price_cents = EXCLUDED.price_cents, compare_at_cents = EXCLUDED.compare_at_cents,
          available = EXCLUDED.available, name = EXCLUDED.name, url = EXCLUDED.url,
          image_url = EXCLUDED.image_url, brand = EXCLUDED.brand, last_seen_at = now()
      `, [storeKey,
        col(r => r.itemId), col(r => r.variantId), col(r => r.size), col(r => r.color),
        col(r => r.priceCents), col(r => r.compareAtCents), col(r => r.available),
        col(r => r.name), col(r => r.url), col(r => r.imageUrl), col(r => r.brand)]);
    }

    if (missingWatchedIds.length) {
      await client.query(`
        UPDATE listing_variants SET available = false, last_seen_at = now()
        WHERE store_key = $1 AND item_id = ANY($2::text[])
      `, [storeKey, missingWatchedIds]);
    }

    // Keep price and stock only for items someone still watches.
    await client.query(`
      DELETE FROM listing_variants WHERE store_key = $1 AND NOT (item_id = ANY($2::text[]))
    `, [storeKey, watchedItemIds]);

    for (const e of events) {
      await client.query(`
        INSERT INTO listing_changes
          (store_key, item_id, variant_id, size, change_type, old_price_cents, new_price_cents, name, url, image_url, brand)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [storeKey, e.itemId, e.variantId || null, e.size || null, e.type, e.oldPriceCents ?? null,
        e.newPriceCents ?? null, e.name || null, e.url || null, e.imageUrl || null, e.brand || null]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getOverrides() {
  await ensureSchema();
  const { rows } = await pool.query('SELECT store_key, script, reason FROM listing_store_overrides');
  return new Map(rows.map(r => [r.store_key, r]));
}

/**
 * Per-store health for the refresh job and the repair work: last run, how many
 * broken runs in a row, and when the store last saved a healthy run.
 */
async function getStatus() {
  await ensureSchema();
  const { rows } = await pool.query(`
    WITH ranked AS (
      SELECT store_key, status, reason, run_id, script_name, script_version, ran_at,
             ROW_NUMBER() OVER (PARTITION BY store_key ORDER BY ran_at DESC) AS rn
      FROM listing_runs WHERE ran_at > now() - interval '7 days'
    )
    SELECT store_key,
           MAX(ran_at) AS last_run_at,
           MAX(ran_at) FILTER (WHERE status IN ('ok','baseline')) AS last_ok_at,
           (array_agg(status ORDER BY ran_at DESC))[1] AS last_status,
           (array_agg(reason ORDER BY ran_at DESC))[1] AS last_reason,
           (array_agg(run_id ORDER BY ran_at DESC))[1] AS last_run_id,
           (array_agg(script_name ORDER BY ran_at DESC))[1] AS script_name,
           (array_agg(script_version ORDER BY ran_at DESC))[1] AS script_version,
           COALESCE(MIN(rn) FILTER (WHERE status <> 'broken'), COUNT(*) + 1) - 1 AS consecutive_broken
    FROM ranked GROUP BY store_key ORDER BY store_key
  `);
  return rows.map(r => ({ ...r, consecutive_broken: Number(r.consecutive_broken) }));
}

module.exports = { ensureSchema, loadState, recordRun, saveRun, getOverrides, getStatus, SCHEMA_SQL };
