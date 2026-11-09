/**
 * Which stores to refresh this run, and what to ask each store script for.
 *
 * A store is refreshed when someone watches an item there (a size or a price,
 * from the Notify me work) or follows it. Watched items are looked up one by
 * one; followed stores also get a few searches to catch new drops, because
 * Shopify's Catalog rules forbid copying a whole catalog.
 *
 * Returned to the scheduled job by GET /api/v1/listings/plan. The job hands it
 * to store scripts that run with no secrets, so nothing secret goes in here.
 */

const logger = require('../../utils/logger');
const { listPartners } = require('../agentBridges');
const { followersByStoreKey } = require('./followedStores');
const store = require('./store');

const DEFAULT_SCRIPT = 'shopify-catalog';
// Searches that tend to surface a store's newest women's items. New items are
// ids Muse has not seen before, so a broad query is fine.
const NEW_DROP_QUERIES = ['new arrivals women', 'new women', 'just in'];
const MAX_WATCHED_PER_STORE = 200;

async function loadWatches() {
  try {
    // eslint-disable-next-line global-require
    const watches = require('../watches');
    if (typeof watches.listActiveWatches === 'function') return await watches.listActiveWatches();
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') logger.warn(`listingWatch: watches unavailable: ${err.message}`);
  }
  return [];
}

/**
 * @param {Object} [opts]
 * @param {string[]} [opts.extraStores] - store keys to include even with no watches or follows (testing)
 * @returns {Promise<Array<{storeKey, domain, endpoint, script, watchedItemIds, searchQueries}>>}
 */
async function buildPlan({ extraStores = [], deps = {} } = {}) {
  const partners = (deps.listPartners || listPartners)({ protocol: 'ucp-mcp' });
  const byKey = new Map(partners.map(p => [p.key, p]));
  const [watches, followers, overrides] = await Promise.all([
    (deps.loadWatches || loadWatches)(),
    (deps.followersByStoreKey || followersByStoreKey)(),
    (deps.getOverrides || store.getOverrides)().catch(() => new Map()),
  ]);

  const tasks = new Map();
  const taskFor = key => {
    const partner = byKey.get(key);
    if (!partner || !partner.endpoint) return null;
    if (!tasks.has(key)) {
      tasks.set(key, {
        storeKey: key,
        domain: partner.domain,
        endpoint: partner.endpoint,
        script: overrides.get(key)?.script || DEFAULT_SCRIPT,
        watchedItemIds: [],
        searchQueries: [],
      });
    }
    return tasks.get(key);
  };

  for (const w of watches) {
    const t = taskFor(w.store_key);
    if (t && !t.watchedItemIds.includes(String(w.item_id)) && t.watchedItemIds.length < MAX_WATCHED_PER_STORE) {
      t.watchedItemIds.push(String(w.item_id));
    }
  }
  for (const key of [...followers.keys(), ...extraStores]) {
    const t = taskFor(key);
    if (t) t.searchQueries = NEW_DROP_QUERIES;
  }
  return [...tasks.values()];
}

module.exports = { buildPlan, NEW_DROP_QUERIES, DEFAULT_SCRIPT };
