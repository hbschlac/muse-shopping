/**
 * Which shoppers follow which store, keyed the way listing refresh and alerts
 * name stores:
 *   - a partner store (src/services/agentBridges/partners.json) -> its `key`
 *   - any other store -> stores.slug (e.g. tjmaxx, nordstrom-rack)
 *
 * A follow is a row in user_brand_follows. Brands are matched to partners by
 * website host first, then by name or slug, because the brands table and
 * partners.json were filled in separately.
 *
 * Shared with the push alerts work (src/services/notifications), so there is
 * one definition of "follows this store".
 */

const pool = require('../../db/pool');
const logger = require('../../utils/logger');
const { listPartners } = require('../agentBridges');

const host = url => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * @param {Object} brand - { name, slug, website_url }
 * @param {Array} partners - partners.json entries
 * @returns {string|null} store key
 */
function storeKeyForBrand(brand, partners) {
  const h = host(brand.website_url);
  if (h) {
    const byHost = partners.find(p => host(p.domain) === h);
    if (byHost) return byHost.key;
  }
  const n = norm(brand.name);
  const s = norm(brand.slug);
  const byName = partners.find(p => norm(p.name) === n || norm(p.key) === s || norm(p.key) === n);
  if (byName) return byName.key;
  return brand.slug || null;
}

/**
 * @returns {Promise<Map<string, Array<{userId: number, notificationEnabled: boolean}>>>}
 */
async function followersByStoreKey({ partners = listPartners({ supportedOnly: false }) } = {}) {
  const out = new Map();
  let rows = [];
  try {
    ({ rows } = await pool.query(`
      SELECT ubf.user_id, COALESCE(ubf.notification_enabled, true) AS notification_enabled,
             b.name, b.slug, b.website_url
      FROM user_brand_follows ubf
      JOIN brands b ON b.id = ubf.brand_id
    `));
  } catch (err) {
    logger.warn(`followedStores: query failed: ${err.message}`);
    return out;
  }
  for (const r of rows) {
    const k = storeKeyForBrand(r, partners);
    if (!k) continue;
    if (!out.has(k)) out.set(k, []);
    out.get(k).push({ userId: r.user_id, notificationEnabled: r.notification_enabled !== false });
  }
  return out;
}

module.exports = { followersByStoreKey, storeKeyForBrand };
