/**
 * New arrivals for Home: one carousel per store, newest first.
 *
 * "New" means first seen by Muse in the last NEW_WINDOW_DAYS. Items come from
 * store_catalog_items (TJ Maxx scraper, Nordstrom Rack and later affiliate
 * feeds) and, for Nordstrom, the existing nordstrom_products table. Each
 * source query fails soft, so a missing table or empty store just hides that
 * store's carousel.
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { tagProduct } = require('./agentBridges/itemTagger');

const NEW_WINDOW_DAYS = 14;
// Items not seen again within this many days are treated as sold out or removed.
const STALE_AFTER_DAYS = 10;
const CANDIDATES_PER_STORE = 80;
const MIN_ITEMS = 6;

const STORES = [
  { slug: 'nordstrom', name: 'Nordstrom', url: 'https://www.nordstrom.com' },
  { slug: 'nordstrom-rack', name: 'Nordstrom Rack', url: 'https://www.nordstromrack.com' },
  { slug: 'tjmaxx', name: 'TJ Maxx', url: 'https://tjmaxx.tjx.com' },
];

const CATEGORIES = {
  'womens-clothing': {
    label: "women's clothing",
    department: 'women',
    // Tagger categories that are not clothing.
    exclude: new Set(['shoes', 'bag', 'jewelry', 'accessories', 'beauty']),
  },
};

// Same DDL as migrations/079_create_store_new_arrivals.sql. Applied once per
// process so the live database gets the table without a manual migration run.
// Every statement is idempotent and only adds.
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS store_catalog_items (
    id SERIAL PRIMARY KEY,
    store_slug VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    brand_name VARCHAR(255),
    price_cents INTEGER,
    original_price_cents INTEGER,
    image_url TEXT,
    product_url TEXT NOT NULL,
    department VARCHAR(50),
    category VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    source VARCHAR(50) NOT NULL DEFAULT 'scraper',
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_slug, external_id)
  );
  CREATE INDEX IF NOT EXISTS idx_store_catalog_items_new
    ON store_catalog_items (store_slug, department, first_seen_at DESC);
  INSERT INTO stores (name, slug, display_name, website_url, integration_type, supports_checkout, category)
  VALUES ('tjmaxx', 'tjmaxx', 'TJ Maxx', 'https://tjmaxx.tjx.com', 'redirect', false, 'fashion')
  ON CONFLICT DO NOTHING;
`;

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).catch(err => {
      schemaReady = null; // try again on the next request
      logger.warn(`New arrivals: schema setup failed: ${err.message}`);
    });
  }
  return schemaReady;
}

const CATALOG_QUERY = `
  SELECT external_id AS id, name, brand_name, price_cents, original_price_cents,
         image_url, product_url, category, first_seen_at
  FROM store_catalog_items
  WHERE store_slug = $1
    AND (department = $2 OR department IS NULL)
    AND is_available = true
    AND last_seen_at > NOW() - ($3 || ' days')::interval
  ORDER BY first_seen_at DESC
  LIMIT $4
`;

// nordstrom_products holds Nordstrom women's clothing only (migration 069).
const NORDSTROM_QUERY = `
  SELECT product_id AS id, product_name AS name, brand_name,
         ROUND(current_price * 100)::int AS price_cents,
         ROUND(original_price * 100)::int AS original_price_cents,
         image_url, product_url, category, first_seen_at
  FROM nordstrom_products
  WHERE is_in_stock = true
    AND last_seen_at > NOW() - ($1 || ' days')::interval
  ORDER BY first_seen_at DESC
  LIMIT $2
`;

async function safeRows(label, sql, params) {
  try {
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (err) {
    logger.warn(`New arrivals: ${label} query failed: ${err.message}`);
    return [];
  }
}

function toItem(row, store) {
  const price = row.price_cents != null ? Number(row.price_cents) : null;
  const original = row.original_price_cents != null ? Number(row.original_price_cents) : null;
  return {
    id: `${store.slug}:${row.id}`,
    name: row.name,
    brand_name: row.brand_name || null,
    price: price != null ? price / 100 : null,
    original_price: original && price && original > price ? original / 100 : null,
    image_url: row.image_url || null,
    product_url: row.product_url,
    first_seen_at: row.first_seen_at,
  };
}

async function loadStoreRows(store, category) {
  const rows = await safeRows(store.slug, CATALOG_QUERY,
    [store.slug, category.department, String(STALE_AFTER_DAYS), CANDIDATES_PER_STORE]);
  if (store.slug === 'nordstrom') {
    rows.push(...await safeRows('nordstrom_products', NORDSTROM_QUERY,
      [String(STALE_AFTER_DAYS), CANDIDATES_PER_STORE]));
  }
  return rows;
}

/**
 * @param {Object} opts
 * @param {string} [opts.category] - key of CATEGORIES
 * @param {string[]} [opts.stores] - store slugs; default all
 * @param {number} [opts.limit] - items per carousel
 * @param {Date} [opts.now]
 * @returns {Promise<Array<{store, title, subtitle, new_count, items}>>}
 */
async function getNewArrivals({ category = 'womens-clothing', stores = null, limit = 20, now = new Date() } = {}) {
  const cat = CATEGORIES[category];
  if (!cat) return [];
  await ensureSchema();
  const targets = STORES.filter(s => !stores || stores.includes(s.slug));
  const cutoff = now.getTime() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const carousels = await Promise.all(targets.map(async store => {
    const rows = await loadStoreRows(store, cat);
    const seen = new Set();
    const items = rows
      .filter(r => r.product_url && r.name)
      .filter(r => !cat.exclude.has(tagProduct({ title: r.name }).category))
      .sort((a, b) => new Date(b.first_seen_at) - new Date(a.first_seen_at))
      .filter(r => !seen.has(r.id) && seen.add(r.id))
      .slice(0, limit)
      .map(r => toItem(r, store));

    if (items.length < MIN_ITEMS) return null;

    const newCount = items.filter(i => new Date(i.first_seen_at).getTime() >= cutoff).length;
    return {
      store: { slug: store.slug, name: store.name, url: store.url },
      category,
      title: `New at ${store.name}`,
      subtitle: newCount > 0
        ? `${newCount}${newCount === limit ? '+' : ''} new in ${cat.label} in the last ${NEW_WINDOW_DAYS} days`
        : `Latest in ${cat.label}`,
      new_count: newCount,
      items,
    };
  }));

  return carousels.filter(Boolean);
}

/**
 * Upsert items seen in one scraper run or feed import. first_seen_at is set
 * once, so re-seeing an item never makes it "new" again.
 * @param {string} storeSlug
 * @param {Array<{externalId, name, brandName, priceCents, originalPriceCents, imageUrl, productUrl, department, category}>} items
 * @param {string} source
 * @returns {Promise<{seen: number, added: number}>}
 */
/**
 * Tell the outside world that new items just showed up at a store.
 * Posts JSON to NEW_ARRIVALS_WEBHOOK_URL (any webhook receiver) and, when
 * SLACK_WEBHOOK_URL is set, a Slack message. Never throws.
 */
async function notifyNewArrivals(storeSlug, newItems, { fetchImpl = global.fetch } = {}) {
  if (!newItems.length) return { sent: [] };
  const store = STORES.find(s => s.slug === storeSlug) || { slug: storeSlug, name: storeSlug };
  const sent = [];
  const payload = {
    event: 'new_arrivals',
    store: { slug: store.slug, name: store.name },
    count: newItems.length,
    detected_at: new Date().toISOString(),
    items: newItems.slice(0, 50).map(i => ({
      id: String(i.externalId), name: i.name, brand: i.brandName || null,
      price: i.priceCents != null ? i.priceCents / 100 : null,
      image_url: i.imageUrl || null, url: i.productUrl,
    })),
  };

  if (process.env.NEW_ARRIVALS_WEBHOOK_URL && fetchImpl) {
    try {
      const res = await fetchImpl(process.env.NEW_ARRIVALS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'MuseShopping-NewArrivals/1.0' },
        body: JSON.stringify(payload),
      });
      if (res.ok) sent.push('webhook');
      else logger.warn(`New arrivals webhook returned ${res.status}`);
    } catch (err) {
      logger.warn(`New arrivals webhook failed: ${err.message}`);
    }
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    const AlertService = require('./alertService');
    const names = payload.items.slice(0, 5).map(i => i.name).join(', ');
    const ok = await AlertService.sendSlackAlert('info', `${payload.count} new at ${store.name}`, names, {}).catch(() => false);
    if (ok) sent.push('slack');
  }

  logger.info(`New arrivals: ${payload.count} new at ${store.name}${sent.length ? ` (alerted: ${sent.join(', ')})` : ''}`);
  return { sent, payload };
}

async function recordSeenItems(storeSlug, items, source = 'scraper', { notify = true } = {}) {
  await ensureSchema();
  let added = 0;
  const newItems = [];
  for (const it of items) {
    if (!it.externalId || !it.name || !it.productUrl) continue;
    const { rows } = await pool.query(`
      INSERT INTO store_catalog_items
        (store_slug, external_id, name, brand_name, price_cents, original_price_cents,
         image_url, product_url, department, category, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (store_slug, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        brand_name = COALESCE(EXCLUDED.brand_name, store_catalog_items.brand_name),
        price_cents = EXCLUDED.price_cents,
        original_price_cents = EXCLUDED.original_price_cents,
        image_url = COALESCE(EXCLUDED.image_url, store_catalog_items.image_url),
        product_url = EXCLUDED.product_url,
        is_available = true,
        last_seen_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `, [storeSlug, String(it.externalId), it.name, it.brandName || null, it.priceCents ?? null,
      it.originalPriceCents ?? null, it.imageUrl || null, it.productUrl, it.department || null,
      it.category || null, source]);
    if (rows[0]?.inserted) {
      added += 1;
      newItems.push(it);
    }
  }
  const alerted = notify ? (await notifyNewArrivals(storeSlug, newItems)).sent : [];
  return { seen: items.length, added, alerted };
}

module.exports = { ensureSchema, getNewArrivals, recordSeenItems, notifyNewArrivals, STORES, CATEGORIES, NEW_WINDOW_DAYS };
