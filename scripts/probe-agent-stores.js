#!/usr/bin/env node
/**
 * Probe candidate stores for sanctioned agent endpoints and rebuild the bridge
 * partner registry (src/services/agentBridges/partners.json).
 *
 * For each domain in candidates.json it fetches https://<domain>/.well-known/ucp
 * (Universal Commerce Protocol) and https://<domain>/.well-known/acp.json
 * (Agentic Commerce Protocol) and records what the store publishes. Only these
 * public, agent-facing manifests are read; no storefront pages are loaded.
 *
 * Usage: node scripts/probe-agent-stores.js [--concurrency 16]
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../src/services/agentBridges');
const CANDIDATES = path.join(DIR, 'candidates.json');
const OUT = path.join(DIR, 'partners.json');
const UA = 'MuseShopping-Agent/1.0 (+https://www.muse.shopping/.well-known/ucp)';

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: controller.signal });
    if (!res.ok) return { status: res.status, json: null };
    try {
      return { status: res.status, json: await res.json() };
    } catch (e) {
      return { status: res.status, json: null };
    }
  } catch (e) {
    return { status: 0, json: null };
  } finally {
    clearTimeout(timer);
  }
}

async function probe(candidate) {
  const domain = candidate.domain;
  const [ucpRes, acpRes] = await Promise.all([
    getJson(`https://${domain}/.well-known/ucp`),
    getJson(`https://${domain}/.well-known/acp.json`),
  ]);

  const entry = { ...candidate, checkedAt: new Date().toISOString().slice(0, 10) };
  const ucp = ucpRes.json && ucpRes.json.ucp;
  if (ucp) {
    const services = (ucp.services && ucp.services['dev.ucp.shopping']) || [];
    const mcp = services.find(s => s.transport === 'mcp' && s.endpoint);
    const rest = services.find(s => s.transport === 'rest' && s.endpoint);
    const caps = Object.keys(ucp.capabilities || {});
    entry.protocol = mcp ? 'ucp-mcp' : (rest ? 'ucp-rest' : 'ucp');
    entry.endpoint = (mcp || rest || {}).endpoint || null;
    entry.ucpVersion = ucp.version || null;
    entry.platform = /myshopify\.com/.test(entry.endpoint || '') ? 'shopify' : 'other';
    entry.canSearch = caps.includes('dev.ucp.shopping.catalog.search');
    entry.canCart = caps.includes('dev.ucp.shopping.cart');
    entry.canCheckout = caps.includes('dev.ucp.shopping.checkout');
    entry.paymentHandlers = Object.keys(ucp.payment_handlers || {});
  } else if (acpRes.json) {
    entry.protocol = 'acp';
    entry.endpoint = acpRes.json.base_url || acpRes.json.endpoint || null;
  } else {
    entry.protocol = null;
    entry.httpStatus = ucpRes.status;
  }
  return entry;
}

async function main() {
  const concurrency = Number(process.argv[process.argv.indexOf('--concurrency') + 1]) || 16;
  const candidates = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8'));
  const results = [];
  let i = 0;
  async function worker() {
    while (i < candidates.length) {
      const c = candidates[i++];
      results.push(await probe(c));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const live = results.filter(r => r.protocol).sort((a, b) => a.name.localeCompare(b.name));
  const none = results.filter(r => !r.protocol).sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), partners: live, notYet: none }, null, 2)}\n`);
  console.log(`${live.length} of ${results.length} stores publish an agent manifest; wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
