#!/usr/bin/env node
'use strict';

// Live dry run of one store script against the real store: what it would
// save, without saving it. This is the "preview" for a repair PR.
//
//   node scripts/repair/dry-run.js <storeKey> [script]
//
// Exit 0 when the output passes the contract and has at least one listing
// with a price; 1 otherwise. Runs in a job with no secrets.

const { runTask } = require('../../extractors/run-one');
const { taskFor } = require('./capture');

function verdict(run) {
  if (!run.ok) return { pass: false, reason: run.error || 'script failed' };
  const listings = run.output.listings;
  if (!listings.length) return { pass: false, reason: 'no listings' };
  const priced = listings.filter((l) => l.variants.some((v) => v.priceCents != null)).length;
  if (priced < Math.ceil(listings.length / 2)) return { pass: false, reason: `only ${priced}/${listings.length} listings have a price` };
  return { pass: true, reason: `${listings.length} listings, ${priced} priced` };
}

async function main() {
  const [storeKey, script] = process.argv.slice(2);
  const partners = require('../../src/services/agentBridges/partners.json');
  const task = { ...taskFor(storeKey, partners), script: script || storeKey };
  const run = await runTask(task);
  const v = verdict(run);
  const sample = run.output ? run.output.listings.slice(0, 3) : [];
  console.log(JSON.stringify({ store: storeKey, script: task.script, ...v, requestsUsed: run.requestsUsed, ms: run.ms, sample }, null, 2));
  process.exit(v.pass ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { verdict };
