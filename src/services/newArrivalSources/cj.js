/**
 * CJ (Commission Junction) Product Feed API -> store_catalog_items.
 *
 * Same flow as rakuten.js: polled from the cloud by
 * POST /api/v1/newsfeed/new-arrivals/poll; recordSeenItems marks first-time
 * items as new and fires the new-arrivals alert. This is the sanctioned route
 * for TJ Maxx, whose affiliate program runs on CJ.
 *
 * Env (set in Vercel, never in code or chat):
 *   CJ_API_TOKEN       - personal access token (developers.cj.com)
 *   CJ_COMPANY_ID      - your CJ publisher company ID (CID)
 *   CJ_ADVERTISERS     - "tjmaxx:<advertiser id>,nordstrom-rack:<advertiser id>"
 *
 * Endpoint and field names follow CJ's GraphQL Product Feed docs; confirm them
 * against developers.cj.com once the account has an approved advertiser.
 */

const logger = require('../../utils/logger');
const { recordSeenItems } = require('../newArrivalsService');

const API = 'https://ads.api.cj.com/query';
const PAGE_SIZE = 100;

const QUERY = `
  query Products($companyId: ID!, $partnerIds: [ID!], $keywords: [String!], $limit: Int, $offset: Int) {
    shoppingProducts(companyId: $companyId, partnerIds: $partnerIds, keywords: $keywords, limit: $limit, offset: $offset) {
      totalCount
      resultList {
        id title brand gender productType link imageLink
        price { amount }
        salePrice { amount }
        googleProductCategory { name }
      }
    }
  }
`;

function parseAdvertisers(value) {
  return String(value || '')
    .split(',')
    .map(pair => pair.trim().split(':').map(s => s.trim()))
    .filter(([slug, id]) => slug && /^\d+$/.test(id || ''))
    .map(([storeSlug, advertiserId]) => ({ storeSlug, advertiserId }));
}

function isConfigured(env = process.env) {
  return !!(env.CJ_API_TOKEN && env.CJ_COMPANY_ID && parseAdvertisers(env.CJ_ADVERTISERS).length);
}

const toCents = v => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

/** Turn a shoppingProducts.resultList into store_catalog_items rows, women only. */
function parseProducts(resultList) {
  const items = [];
  for (const p of resultList || []) {
    if (!p || !p.id || !p.title || !p.link) continue;
    const category = [p.googleProductCategory?.name, p.productType].filter(Boolean).join(' > ');
    const gender = String(p.gender || '').toLowerCase();
    const text = `${category} ${p.title}`.toLowerCase();
    if (gender && !/female|women|unisex/.test(gender)) continue;
    if (!gender && /\b(men'?s|boys?|girls?|kids?|baby|home)\b/.test(text) && !/\bwom[ae]n'?s?\b/.test(text)) continue;

    const price = toCents(p.price?.amount);
    const sale = toCents(p.salePrice?.amount);
    const onSale = sale && price && sale < price;
    items.push({
      externalId: String(p.id),
      name: p.title,
      brandName: p.brand || null,
      priceCents: onSale ? sale : price,
      originalPriceCents: onSale ? price : null,
      imageUrl: p.imageLink || null,
      productUrl: p.link,
      department: 'women',
      category: category ? category.slice(0, 100) : null,
    });
  }
  return items;
}

async function searchAdvertiser(advertiserId, { offset = 0, keywords = ['women'], fetchImpl = global.fetch, env = process.env } = {}) {
  const res = await fetchImpl(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CJ_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { companyId: env.CJ_COMPANY_ID, partnerIds: [advertiserId], keywords, limit: PAGE_SIZE, offset },
    }),
  });
  if (!res.ok) throw new Error(`CJ product search failed for ${advertiserId}: ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`CJ product search error for ${advertiserId}: ${body.errors[0].message}`);
  return parseProducts(body.data?.shoppingProducts?.resultList);
}

/**
 * Poll every configured CJ advertiser once and save what it returns.
 * @returns {Promise<Array<{storeSlug, seen, added, alerted?, error?}>>}
 */
async function pollCj({ pages = 3, fetchImpl = global.fetch, env = process.env } = {}) {
  if (!isConfigured(env)) return [{ skipped: 'cj not configured' }];
  const results = [];
  for (const { storeSlug, advertiserId } of parseAdvertisers(env.CJ_ADVERTISERS)) {
    try {
      const items = [];
      for (let page = 0; page < pages; page++) {
        const batch = await searchAdvertiser(advertiserId, { offset: page * PAGE_SIZE, fetchImpl, env });
        items.push(...batch);
        if (batch.length < PAGE_SIZE / 2) break;
      }
      const saved = await recordSeenItems(storeSlug, items, 'cj');
      results.push({ storeSlug, ...saved });
    } catch (err) {
      logger.warn(`CJ poll failed for ${storeSlug}: ${err.message}`);
      results.push({ storeSlug, error: err.message });
    }
  }
  return results;
}

module.exports = { pollCj, parseProducts, parseAdvertisers, isConfigured };
