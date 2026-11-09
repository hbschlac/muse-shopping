/**
 * The only helpers a store script gets. "Code mode": a script is a short
 * program written against these typed calls, not raw network access.
 *
 *   tools.ucp.search(query, { limit, cursor })  Shopify Catalog search_catalog
 *   tools.ucp.lookup(ids)                      Shopify Catalog lookup_catalog (10 per call, batched here)
 *   tools.http.getText(url)                    GET a page on the task's own store
 *   tools.html.jsonLdProducts(html, baseUrl)   schema.org Product objects embedded in a page
 *   tools.log(...)                             goes to stderr, never into the output
 *
 * Every request must go to the task's own store (its domain or its UCP
 * endpoint host), over https, within a request budget. These limits are the
 * contract; the real isolation is that store scripts run in a GitHub job with
 * no secrets at all (see .github/workflows/refresh-listings.yml).
 *
 * This file must not require anything outside extractors/ except
 * src/services/listingWatch/contract.js. A test enforces it.
 */

const PROFILE_URL = 'https://www.muse.shopping/.well-known/ucp';
const USER_AGENT = 'MuseShopping-ListingWatch/1.0 (+https://www.muse.shopping/.well-known/ucp)';
const LOOKUP_BATCH = 10;
const REQUEST_TIMEOUT_MS = 15000;
const PAUSE_MS = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {Object} task - { storeKey, domain, endpoint }
 * @param {Object} [opts]
 * @param {number} [opts.maxRequests]
 * @param {Function} [opts.fetchImpl]
 * @param {number} [opts.pauseMs]
 */
function createTools(task, { maxRequests = 60, fetchImpl = global.fetch, pauseMs = PAUSE_MS } = {}) {
  const allowed = new Set([hostOf(`https://${task.domain}`), hostOf(task.endpoint)].filter(Boolean));
  const bare = [...allowed].map(h => h.replace(/^www\./, ''));
  bare.forEach(h => { allowed.add(h); allowed.add(`www.${h}`); });
  let used = 0;
  let rpcId = 0;

  async function request(url, init = {}) {
    const u = new URL(url);
    if (u.protocol !== 'https:') throw new Error(`blocked: ${url} is not https`);
    if (!allowed.has(u.hostname.toLowerCase())) throw new Error(`blocked: ${u.hostname} is not this store`);
    if (u.username || u.password) throw new Error('blocked: credentials in URL');
    used += 1;
    if (used > maxRequests) throw new Error(`request budget of ${maxRequests} used up`);
    if (used > 1 && pauseMs) await sleep(pauseMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetchImpl(u.toString(), {
        ...init,
        redirect: 'error',
        headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function callTool(name, args) {
    if (!task.endpoint) throw new Error('this store has no UCP endpoint');
    rpcId += 1;
    const res = await request(task.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: rpcId,
        method: 'tools/call',
        params: { name, arguments: { ...args, meta: { 'ucp-agent': { profile: PROFILE_URL } } } },
      }),
    });
    let payload;
    try {
      payload = await res.json();
    } catch {
      throw new Error(`${name}: store returned non-JSON (HTTP ${res.status})`);
    }
    if (payload.error) throw new Error(`${name}: ${payload.error.message || 'error'} (${payload.error.code ?? res.status})`);
    const result = payload.result || {};
    let body = result.structuredContent;
    if (!body) {
      const text = (result.content || []).find(b => b && b.type === 'text')?.text;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { text };
      }
    }
    if (result.isError) throw new Error(`${name}: ${body?.message || body?.text || 'tool error'}`);
    return body;
  }

  const context = { address_country: 'US', currency: 'USD' };

  const ucp = {
    async search(query, { limit = 50, cursor = null } = {}) {
      const body = await callTool('search_catalog', {
        catalog: { query, context, pagination: { limit, ...(cursor ? { cursor } : {}) } },
      });
      return {
        products: body.products || [],
        nextCursor: body.pagination?.has_next_page ? body.pagination.cursor : null,
      };
    },
    async lookup(ids) {
      const products = [];
      const notFound = [];
      for (let i = 0; i < ids.length; i += LOOKUP_BATCH) {
        const body = await callTool('lookup_catalog', { catalog: { ids: ids.slice(i, i + LOOKUP_BATCH), context } });
        products.push(...(body.products || []));
        for (const m of body.messages || []) {
          if (m && m.code === 'not_found' && m.content) notFound.push(String(m.content));
        }
      }
      return { products, notFound };
    },
  };

  const http = {
    async getText(url) {
      const res = await request(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
      if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
      return res.text();
    },
  };

  const html = { jsonLdProducts };

  const log = (...args) => process.stderr.write(`${args.join(' ')}\n`);

  return { ucp, http, html, log, get requestsUsed() { return used; } };
}

/**
 * Pull schema.org Product (and ProductGroup) objects out of a page's
 * <script type="application/ld+json"> blocks. Returns the raw objects; turning
 * them into listings is the store script's job.
 */
function jsonLdProducts(htmlText) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const type = [].concat(node['@type'] || []);
    if (type.includes('Product') || type.includes('ProductGroup')) out.push(node);
    if (node['@graph']) walk(node['@graph']);
    if (node.itemListElement) walk([].concat(node.itemListElement).map(e => e.item || e));
  };
  for (const [, raw] of String(htmlText).matchAll(re)) {
    try {
      walk(JSON.parse(raw.trim()));
    } catch {
      // A page with one bad block can still have good ones.
    }
  }
  return out;
}

module.exports = { createTools, jsonLdProducts, PROFILE_URL };
