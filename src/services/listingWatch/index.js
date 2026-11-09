/**
 * Listing refresh: store scripts pull listings, Muse compares runs and records
 * new items, price changes and sizes back in stock in listing_changes.
 * Design: https://claude.ai/artifact/KZCuvzhasvwGdFnuGFLb2B
 */

const { validateOutput } = require('./contract');
const { assessRun } = require('./health');
const { diffListings } = require('./differ');
const { ingestRun } = require('./ingest');
const { buildPlan } = require('./plan');
const { followersByStoreKey, storeKeyForBrand } = require('./followedStores');
const store = require('./store');

module.exports = {
  validateOutput,
  assessRun,
  diffListings,
  ingestRun,
  buildPlan,
  followersByStoreKey,
  storeKeyForBrand,
  getStatus: store.getStatus,
  ensureSchema: store.ensureSchema,
};
