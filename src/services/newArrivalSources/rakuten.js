/**
 * Rakuten Advertising Product Search -> store_catalog_items.
 *
 * Polled from the cloud (see POST /api/v1/newsfeed/new-arrivals/poll). Each
 * poll reads the newest women's items for every configured advertiser and
 * saves them; recordSeenItems marks first-time items as new and fires the
 * new-arrivals alert.
 *
 * Env (set in Vercel, never in code or chat):
 *   RAKUTEN_CLIENT_ID, RAKUTEN_CLIENT_SECRET  - from the publisher dashboard API page
 *     (or RAKUTEN_TOKEN_KEY, which is base64(client_id:client_secret))
 *   RAKUTEN_SID                               - publisher account / site ID
 *   RAKUTEN_ADVERTISERS                       - "nordstrom:<mid>,nordstrom-rack:<mid>"
 *
 * The token request and the XML shape follow Rakuten's public docs; confirm
 * both against the dashboard once the account has API access.
 */

const logger = require('../../utils/logger');
const { recordSeenItems } = require('../newArrivalsService');

const API = 'https://api.linksynergy.com';
const PAGE_SIZE = 100;

let cachedToken = null; // { value, expiresAt }

function tokenKey(env = process.env) {
  if (env.RAKUTEN_TOKEN_KEY) return env.RAKUTEN_TOKEN_KEY;
  if (env.RAKUTEN_CLIENT_ID && env.RAKUTEN_CLIENT_SECRET) {
    return Buffer.from(`${env.RAKUTEN_CLIENT_ID}:${env.RAKUTEN_CLIENT_SECRET}`).toString('base64');
  }
  return null;
}

function isConfigured(env = process.env) {
  return !!(tokenKey(env) && env.RAKUTEN_SID && parseAdvertisers(env.RAKUTEN_ADVERTISERS).length);
}

/** "nordstrom:1237, nordstrom-rack:2417" -> [{ storeSlug, mid }] */
function parseAdvertisers(value) {
  return String(value || '')
    .split(',')
    .map(pair => pair.trim().split(':').map(s => s.trim()))
    .filter(([slug, mid]) => slug && /^\d+$/.test(mid || ''))
    .map(([storeSlug, mid]) => ({ storeSlug, mid }));
}

async function getToken({ fetchImpl = global.fetch, env = process.env, now = Date.now() } = {}) {
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;
  const res = await fetchImpl(`${API}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenKey(env)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: env.RAKUTEN_SID }).toString(),
  });
  if (!res.ok) throw new Error(`Rakuten token request failed: ${res.status}`);
  const body = await res.json();
  cachedToken = { value: body.access_token, expiresAt: now + (Number(body.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}

function clearTokenCache() {
  cachedToken = null;
}

const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .trim();

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : null;
}

const toCents = v => {
  const n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

/**
 * Parse a productsearch/1.0 XML response into store_catalog_items rows.
 * Only women's items are kept (by category or name).
 */
function parseProductSearch(xml) {
  const items = [];
  for (const [, block] of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const category = [tag(block, 'primary'), tag(block, 'secondary')].filter(Boolean).join(' > ');
    const name = tag(block, 'productname');
    const url = tag(block, 'linkurl');
    const sku = tag(block, 'sku') || tag(block, 'linkid');
    if (!name || !url || !sku) continue;
    const text = `${category} ${name}`.toLowerCase();
    if (/\b(men'?s|boys?|girls?|kids?|baby|home)\b/.test(text) && !/\bwom[ae]n'?s?\b/.test(text)) continue;

    const price = toCents(tag(block, 'price'));
    const sale = toCents(tag(block, 'saleprice'));
    items.push({
      externalId: sku,
      name,
      brandName: tag(block, 'brand') || null,
      priceCents: sale && price && sale < price ? sale : price,
      originalPriceCents: sale && price && sale < price ? price : null,
      imageUrl: tag(block, 'imageurl'),
      productUrl: url,
      department: 'women',
      category: category || null,
    });
  }
  return items;
}

async function searchAdvertiser(mid, { keyword = 'women', page = 1, fetchImpl = global.fetch, env = process.env } = {}) {
  const token = await getToken({ fetchImpl, env });
  const qs = new URLSearchParams({ mid, keyword, max: String(PAGE_SIZE), pagenumber: String(page) });
  const res = await fetchImpl(`${API}/productsearch/1.0?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/xml' },
  });
  if (res.status === 401) clearTokenCache();
  if (!res.ok) throw new Error(`Rakuten product search failed for ${mid}: ${res.status}`);
  return parseProductSearch(await res.text());
}

/**
 * Poll every configured advertiser once and save what it returns.
 * @returns {Promise<Array<{storeSlug, seen, added, alerted?, error?}>>}
 */
async function pollRakuten({ pages = 3, fetchImpl = global.fetch, env = process.env } = {}) {
  if (!isConfigured(env)) return [{ skipped: 'rakuten not configured' }];
  const results = [];
  for (const { storeSlug, mid } of parseAdvertisers(env.RAKUTEN_ADVERTISERS)) {
    try {
      const items = [];
      for (let page = 1; page <= pages; page++) {
        const batch = await searchAdvertiser(mid, { page, fetchImpl, env });
        items.push(...batch);
        if (batch.length < PAGE_SIZE / 2) break;
      }
      const saved = await recordSeenItems(storeSlug, items, 'rakuten');
      results.push({ storeSlug, ...saved });
    } catch (err) {
      logger.warn(`Rakuten poll failed for ${storeSlug}: ${err.message}`);
      results.push({ storeSlug, error: err.message });
    }
  }
  return results;
}

module.exports = { pollRakuten, parseProductSearch, parseAdvertisers, getToken, clearTokenCache, isConfigured };
