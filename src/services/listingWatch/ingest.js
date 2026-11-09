/**
 * Receive one store's refresh run, decide whether to trust it, and save it.
 *
 * Called by POST /api/v1/listings/ingest from the scheduled refresh job. The
 * listings were produced by a store script that ran with no secrets, so
 * nothing in them is trusted: the contract check runs again here.
 *
 * Outcomes (listing_runs.status):
 *   duplicate  this run id was already received; nothing happens
 *   broken     the script failed or its output fails the health rules; not saved
 *   held       the changes look like a broken script (too many at once, or a
 *              price move over 70%); not saved, and the next run decides
 *   baseline   first run for the store, or the script changed; saved, no alerts
 *   ok         saved, and the changes are queued for alerts
 */

const logger = require('../../utils/logger');
const { validateOutput } = require('./contract');
const { assessRun } = require('./health');
const { diffListings } = require('./differ');
const store = require('./store');

function dispatchQuietly() {
  try {
    // The push alerts work sends right away when it is deployed; its own
    // schedule is the backstop. Never let alerts break ingest.
    // eslint-disable-next-line global-require
    const notifications = require('../notifications');
    if (notifications && typeof notifications.dispatchPending === 'function') {
      Promise.resolve(notifications.dispatchPending()).catch(err =>
        logger.warn(`listingWatch: dispatchPending failed: ${err.message}`));
    }
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') logger.warn(`listingWatch: dispatch skipped: ${err.message}`);
  }
}

/**
 * @param {Object} body
 * @param {string} body.storeKey
 * @param {string} body.runId - unique per scheduled run (GitHub run id + attempt)
 * @param {string} body.scriptName
 * @param {string} body.scriptVersion
 * @param {boolean} body.ok - the script finished
 * @param {string} [body.error]
 * @param {Object} [body.output] - the script's { listings }
 * @param {string[]} [body.watchedItemIds] - what the plan asked it to look up
 * @param {Object} [deps] - injectable for tests
 */
async function ingestRun(body, deps = {}) {
  const db = deps.store || store;
  const storeKey = String(body.storeKey || '').trim();
  const runId = String(body.runId || '').trim();
  if (!storeKey || !runId) throw Object.assign(new Error('storeKey and runId are required'), { statusCode: 400 });

  const state = await db.loadState(storeKey);
  if (state.runIds.has(runId)) return { storeKey, status: 'duplicate' };

  const meta = { runId, scriptName: body.scriptName || null, scriptVersion: body.scriptVersion || null };
  const checked = body.ok ? validateOutput(body.output) : { ok: false, listings: [], errors: [], dropped: 0 };
  const run = {
    ok: !!body.ok && checked.ok,
    error: body.ok ? checked.errors[0] : body.error,
    listings: checked.listings,
    dropped: checked.dropped,
  };

  const health = assessRun(run, { lastGoodCount: state.lastGoodCount });
  if (!health.healthy) {
    await db.recordRun(storeKey, { ...meta, status: 'broken', reason: health.reason, listingCount: run.listings.length });
    logger.warn(`listingWatch: ${storeKey} broken: ${health.reason}`);
    return { storeKey, status: 'broken', reason: health.reason, contractErrors: checked.errors };
  }

  const watchedItemIds = (body.watchedItemIds || []).map(String);
  const diff = diffListings(state, { listings: run.listings, watchedItemIds, scriptVersion: meta.scriptVersion });

  if (diff.storm && state.lastStatus !== 'held') {
    const reason = diff.suspicious.length
      ? `price moves over 70%: ${diff.suspicious.slice(0, 3).join('; ')}`
      : `${diff.events.length} changes in one run`;
    await db.recordRun(storeKey, { ...meta, status: 'held', reason, listingCount: run.listings.length, eventCount: diff.events.length });
    logger.warn(`listingWatch: ${storeKey} held for a second run: ${reason}`);
    return { storeKey, status: 'held', reason };
  }

  await db.saveRun(storeKey, {
    listings: run.listings,
    variantRows: diff.variantRows,
    missingWatchedIds: diff.missingWatchedIds,
    watchedItemIds,
    events: diff.events,
  });
  const status = diff.quiet ? 'baseline' : 'ok';
  await db.recordRun(storeKey, {
    ...meta, status, reason: diff.quiet, listingCount: run.listings.length, eventCount: diff.events.length,
  });
  if (diff.events.length) dispatchQuietly();

  return {
    storeKey,
    status,
    listings: run.listings.length,
    dropped: run.dropped,
    events: diff.events.length,
    missingWatched: diff.missingWatchedIds.length,
  };
}

module.exports = { ingestRun };
