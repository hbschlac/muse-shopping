/**
 * Agent bridges: search and checkout at partner stores through the agent
 * protocols those stores publish, instead of scraping or hidden browsers.
 *
 * Interface every bridge implements (see ucpBridge.js):
 *   searchProducts(query, opts) -> { products: BridgeProduct[], nextCursor }
 *   getProduct(productId, opts) -> BridgeProduct | null
 *   createCart(lines)           -> CheckoutSummary (with continueUrl)
 *   startCheckout(lines, opts)  -> CheckoutSummary (with continueUrl)
 * where lines = [{ variantId, quantity }].
 *
 * To add a protocol (Shopify Global Catalog, ACP, UCP over REST), write a class
 * with those four methods and register it in BRIDGE_FACTORIES below.
 *
 * The partner list lives in partners.json and is rebuilt by
 * `node scripts/probe-agent-stores.js`, which reads each candidate store's
 * /.well-known/ucp and /.well-known/acp.json manifests.
 */

const logger = require('../../utils/logger');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const { UcpBridge } = require('./ucpBridge');
const registry = require('./partners.json');

const SEARCH_TIMEOUT_MS = 6000;
const MAX_PARTNERS_PER_SEARCH = 12;

const BRIDGE_FACTORIES = {
  'ucp-mcp': partner => new UcpBridge(partner),
};

function listPartners({ category = null, protocol = null, supportedOnly = true } = {}) {
  return registry.partners.filter(p =>
    (!category || p.category === category) &&
    (!protocol || p.protocol === protocol) &&
    (!supportedOnly || !!BRIDGE_FACTORIES[p.protocol])
  );
}

function getPartner(key) {
  const partner = registry.partners.find(p => p.key === key);
  if (!partner) throw new NotFoundError(`Agent bridge "${key}"`);
  return partner;
}

function getBridge(key, factories = BRIDGE_FACTORIES) {
  const partner = getPartner(key);
  const factory = factories[partner.protocol];
  if (!factory) {
    throw new ValidationError(`${partner.name} uses ${partner.protocol}, which Muse cannot call yet`);
  }
  return factory(partner);
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Search several partner stores at once.
 * @param {string} query
 * @param {Object} opts
 * @param {string[]} [opts.partners] - partner keys; defaults to every supported partner in `category`
 * @param {string} [opts.category]
 * @param {number} [opts.limitPerPartner]
 */
async function search(query, { partners = null, category = null, limitPerPartner = 4, factories = BRIDGE_FACTORIES } = {}) {
  const q = String(query || '').trim();
  if (!q) throw new ValidationError('A search query is required');

  let targets = partners && partners.length
    ? partners.map(getPartner)
    : listPartners({ category });
  targets = targets.filter(p => factories[p.protocol]).slice(0, MAX_PARTNERS_PER_SEARCH);

  const settled = await Promise.allSettled(targets.map(partner =>
    withTimeout(
      factories[partner.protocol](partner).searchProducts(q, { limit: limitPerPartner }),
      SEARCH_TIMEOUT_MS,
      partner.key
    )
  ));

  const products = [];
  const errors = [];
  settled.forEach((result, i) => {
    const partner = targets[i];
    if (result.status === 'fulfilled') {
      products.push(...result.value.products);
    } else {
      logger.warn(`Bridge search failed for ${partner.key}: ${result.reason?.message}`);
      errors.push({ partnerKey: partner.key, message: result.reason?.message || 'failed' });
    }
  });

  return { query: q, searched: targets.map(p => p.key), products, errors };
}

module.exports = {
  BRIDGE_FACTORIES,
  listPartners,
  getPartner,
  getBridge,
  search,
};
