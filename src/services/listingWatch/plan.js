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
const { DEFAULT_SCRIPT, FALLBACK_SCRIPT } = require('./scripts');

const TRIAL_EVERY_MS = 24 * 60 * 60 * 1000;
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

/** A store on the fallback for a day gets one trial of its own script a day. */
function trialDue(override, now) {
  if (!override || override.script !== FALLBACK_SCRIPT) return false;
  const since = Math.max(new Date(override.set_at || 0).getTime(), new Date(override.last_trial_at || 0).getTime());
  return now - since >= TRIAL_EVERY_MS;
}

/**
 * @param {Object} [opts]
 * @param {string[]} [opts.extraStores] - store keys to include even with no watches or follows (testing)
 * @returns {Promise<Array<{storeKey, domain, endpoint, script, watchedItemIds, watchedItems, searchQueries, trial?}>>}
 *   watchedItems: [{ itemId, url }] with the last saved product URL (null if
 *   never saved), so the fallback can open product pages and keep the same id.
 *   A task with trial: true runs the store's own script while it is on the
 *   fallback; it comes right after that store's normal task.
 */
async function buildPlan({ extraStores = [], deps = {}, now = Date.now() } = {}) {
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

  const list = [...tasks.values()];
  const urls = await (deps.getWatchedUrls || store.getWatchedUrls)(
    list.filter(t => t.watchedItemIds.length).map(t => t.storeKey),
  ).catch(() => new Map());
  const out = [];
  for (const t of list) {
    t.watchedItems = t.watchedItemIds.map(itemId => ({ itemId, url: urls.get(`${t.storeKey}\u0000${itemId}`) || null }));
    out.push(t);
    if (trialDue(overrides.get(t.storeKey), now)) out.push({ ...t, script: DEFAULT_SCRIPT, trial: true });
  }
  return out;
}

module.exports = { buildPlan, trialDue, NEW_DROP_QUERIES, DEFAULT_SCRIPT };
