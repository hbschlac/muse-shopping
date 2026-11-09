/**
 * Decide whether a store script is broken. A broken run is never saved (saving
 * an empty run would look like the whole store sold out), and it is what
 * starts the repair job.
 */

// A drop below this share of the last good run means the page changed, not the store.
const MIN_SHARE_OF_LAST_RUN = 0.4;
// Small stores swing a lot; only apply the drop rule above this size.
const DROP_RULE_MIN_PREVIOUS = 20;
const MIN_PRICED_SHARE = 0.5;

/**
 * @param {Object} run
 * @param {boolean} run.ok - the script finished and its output had the right shape
 * @param {string} [run.error]
 * @param {Array} [run.listings]
 * @param {number} [run.dropped] - listings the contract rejected
 * @param {Object} [history]
 * @param {number|null} [history.lastGoodCount] - listings in the last healthy run
 * @returns {{ healthy: boolean, reason: string|null }}
 */
function assessRun(run, { lastGoodCount = null } = {}) {
  if (!run.ok) return { healthy: false, reason: `script failed: ${run.error || 'unknown error'}` };
  const listings = run.listings || [];
  const count = listings.length;
  if (count === 0) {
    return { healthy: false, reason: run.dropped ? `all ${run.dropped} listings failed the contract` : 'returned no listings' };
  }
  if (lastGoodCount != null && lastGoodCount >= DROP_RULE_MIN_PREVIOUS && count < lastGoodCount * MIN_SHARE_OF_LAST_RUN) {
    return { healthy: false, reason: `returned ${count} listings, last good run had ${lastGoodCount}` };
  }
  const priced = listings.filter(l => l.variants.some(v => v.priceCents != null)).length;
  if (priced / count < MIN_PRICED_SHARE) {
    return { healthy: false, reason: `only ${priced} of ${count} listings have a price` };
  }
  if (run.dropped && run.dropped > count) {
    return { healthy: false, reason: `${run.dropped} listings failed the contract, only ${count} passed` };
  }
  return { healthy: true, reason: null };
}

module.exports = { assessRun, MIN_SHARE_OF_LAST_RUN, DROP_RULE_MIN_PREVIOUS };
