#!/usr/bin/env node
'use strict';

// Saves what the AI repair needs to see about one store, into a folder:
//   task.json      the task a refresh would give the script (from partners.json)
//   store.html     the store's newest-first collection page
//   product.html   the first product page linked from it
//   ucp-search.json a Shopify Catalog search response, when the store has one
//   last-run.json  what the current script does now (ok / error / sample)
// Runs in a job with no secrets. Uses the same tools (own store only, https,
// request budget) as the store scripts.
//
//   node scripts/repair/capture.js <storeKey> <outDir>

const fs = require('fs');
const path = require('path');
const { createTools } = require('../../extractors/tools');
const { runTask } = require('../../extractors/run-one');

const NEW_DROP_QUERIES = ['new arrivals women', 'new women', 'just in'];
const MAX_HTML = 400 * 1024;

function taskFor(storeKey, partners) {
  const list = Array.isArray(partners) ? partners : partners.partners || [];
  const p = list.find((x) => x.key === storeKey);
  if (!p) throw new Error(`unknown store: ${storeKey}`);
  return {
    storeKey,
    domain: p.domain,
    endpoint: p.endpoint || null,
    watchedItemIds: [],
    watchedItems: [],
    searchQueries: NEW_DROP_QUERIES,
  };
}

// Pages are evidence for the AI, not instructions; trim scripts and styles
// that carry no product data, keep JSON-LD and markup.
function trimHtml(html) {
  const src = String(html);
  // Product data first, so the size cap never cuts it off.
  const ld = [...src.matchAll(/<script[^>]+ld\+json[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0]);
  const body = src
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/\n\s*\n+/g, '\n');
  return `${ld.join('\n')}\n${body}`.slice(0, MAX_HTML);
}

async function main() {
  const [storeKey, outDir] = process.argv.slice(2);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(storeKey || '') || !outDir) {
    throw new Error('usage: capture.js <storeKey> <outDir>');
  }
  fs.mkdirSync(outDir, { recursive: true });
  const partners = require('../../src/services/agentBridges/partners.json');
  const task = taskFor(storeKey, partners);
  fs.writeFileSync(path.join(outDir, 'task.json'), JSON.stringify(task, null, 2));

  const tools = createTools(task, { maxRequests: 10 });
  const base = `https://${task.domain}`;
  try {
    const html = await tools.http.getText(`${base}/collections/all?sort_by=created-descending`);
    fs.writeFileSync(path.join(outDir, 'store.html'), trimHtml(html));
    const m = /href=["']([^"'#?]*\/products\/[^"'?#]+)/i.exec(html);
    if (m) {
      const product = await tools.http.getText(new URL(m[1], base).toString());
      fs.writeFileSync(path.join(outDir, 'product.html'), trimHtml(product));
    }
  } catch (err) {
    fs.writeFileSync(path.join(outDir, 'store-error.txt'), String(err.message));
  }
  if (task.endpoint) {
    try {
      const res = await tools.ucp.search(NEW_DROP_QUERIES[0], { limit: 5 });
      fs.writeFileSync(path.join(outDir, 'ucp-search.json'), JSON.stringify(res, null, 2).slice(0, MAX_HTML));
    } catch (err) {
      fs.writeFileSync(path.join(outDir, 'ucp-error.txt'), String(err.message));
    }
  }

  const own = path.join(__dirname, '../../extractors/scripts', `${storeKey}.js`);
  const script = fs.existsSync(own) ? storeKey : 'shopify-catalog';
  const run = await runTask({ ...task, script });
  const sample = run.output ? { count: run.output.listings.length, first: run.output.listings.slice(0, 2) } : null;
  fs.writeFileSync(
    path.join(outDir, 'last-run.json'),
    JSON.stringify({ script, ok: run.ok, error: run.error || null, contractErrors: run.contractErrors || [], sample }, null, 2)
  );
  console.log(`captured ${storeKey} (${task.domain}) with ${script}: ${run.ok ? 'ok' : run.error}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { taskFor, trimHtml };
