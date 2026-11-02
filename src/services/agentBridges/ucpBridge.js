/**
 * Bridge to one store that publishes UCP over MCP (every Shopify store, plus
 * independents such as Réalisation Par).
 *
 * What a bridge can do without a partnership (verified live 2026-11-02 against
 * Allbirds):
 *   - searchProducts / getProduct     -> search_catalog / get_product
 *   - createCart                      -> create_cart, returns the store's continue_url
 *   - startCheckout                   -> create_checkout, returns totals + continue_url
 * The shopper pays on the store's own checkout page (continue_url). Completing
 * payment from Muse (complete_checkout) needs a Shopify "purchase permission"
 * token or a delegated-payment handler, which Muse does not have yet.
 *
 * Product data is fetched live and not stored: Shopify's terms say agents should
 * not cache catalog results or images.
 */

const { discover, callTool } = require('./ucpMcpClient');
const { ValidationError } = require('../../utils/errors');

function money(amount) {
  if (!amount || typeof amount.amount !== 'number') return null;
  return { cents: amount.amount, currency: amount.currency || 'USD' };
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Map a UCP catalog product to Muse's bridge product shape.
 */
function normalizeProduct(product, partner) {
  const variants = (product.variants || []).map(v => ({
    id: v.id,
    sku: v.sku || null,
    title: v.title || null,
    price: money(v.price),
    available: v.availability ? !!v.availability.available : null,
    options: (v.options || []).reduce((acc, o) => {
      if (o && o.name) acc[o.name] = o.label;
      return acc;
    }, {}),
    imageUrl: (v.media || []).find(m => m.type === 'image')?.url || null,
  }));

  const media = product.media || [];
  const imageUrl = media.find(m => m.type === 'image')?.url
    || variants.find(v => v.imageUrl)?.imageUrl
    || null;

  const minPrice = money(product.price_range?.min);
  const maxPrice = money(product.price_range?.max);
  const listMin = money(product.list_price_range?.min);

  return {
    partnerKey: partner.key,
    brand: partner.name,
    id: product.id,
    title: product.title,
    description: stripHtml(product.description?.html || product.description?.plain || product.description),
    url: product.url || null,
    imageUrl,
    price: minPrice,
    maxPrice,
    // Shopify returns 0 when there is no compare-at price.
    compareAtPrice: listMin && listMin.cents > 0 ? listMin : null,
    available: variants.length ? variants.some(v => v.available) : null,
    variants,
  };
}

function summarizeCheckout(checkout) {
  const totals = {};
  for (const t of checkout.totals || []) {
    if (t && t.type) totals[t.type] = { cents: t.amount, label: t.display_text || t.type };
  }
  return {
    id: checkout.id,
    status: checkout.status || null,
    currency: checkout.currency || 'USD',
    totals,
    lineItems: (checkout.line_items || []).map(li => ({
      variantId: li.item?.id,
      title: li.item?.title,
      priceCents: li.item?.price,
      imageUrl: li.item?.image_url || null,
      quantity: li.quantity,
    })),
    policies: (checkout.links || []).map(l => ({ type: l.type, title: l.title, url: l.url })),
    // Items the shopper still has to provide on the store's page (address, contact, etc.)
    needsFromShopper: (checkout.messages || [])
      .filter(m => m.type === 'error')
      .map(m => ({ code: m.code, message: m.content, severity: m.severity })),
    continueUrl: checkout.continue_url || null,
    expiresAt: checkout.expires_at || null,
  };
}

class UcpBridge {
  /**
   * @param {Object} partner - registry entry ({ key, name, domain, ... })
   * @param {Object} [deps] - injectable client for tests
   */
  constructor(partner, deps = {}) {
    this.partner = partner;
    this.protocol = 'ucp-mcp';
    this.client = { discover, callTool, ...deps };
  }

  async endpoint() {
    if (this.partner.endpoint) return this.partner.endpoint;
    const manifest = await this.client.discover(this.partner.domain);
    return manifest.endpoint;
  }

  async searchProducts(query, { country = 'US', currency = 'USD', limit = 10, cursor = null } = {}) {
    const endpoint = await this.endpoint();
    const catalog = {
      query,
      context: { address_country: country, currency },
      pagination: { limit, ...(cursor ? { cursor } : {}) },
    };
    const result = await this.client.callTool(endpoint, 'search_catalog', { catalog });
    return {
      products: (result?.products || []).map(p => normalizeProduct(p, this.partner)),
      nextCursor: result?.pagination?.has_next_page ? result.pagination.cursor : null,
    };
  }

  async getProduct(productId, { country = 'US', currency = 'USD' } = {}) {
    const endpoint = await this.endpoint();
    const result = await this.client.callTool(endpoint, 'get_product', {
      catalog: { id: productId, context: { address_country: country, currency } },
    });
    const product = result?.product || result?.products?.[0];
    return product ? normalizeProduct(product, this.partner) : null;
  }

  /**
   * @param {Array<{variantId: string, quantity: number}>} lines
   */
  async createCart(lines) {
    const endpoint = await this.endpoint();
    const result = await this.client.callTool(endpoint, 'create_cart', {
      cart: { line_items: toLineItems(lines) },
    });
    const cart = result?.cart || result;
    return summarizeCheckout(cart);
  }

  /**
   * Build a checkout at the store and return its totals and continue_url.
   * @param {Array<{variantId: string, quantity: number}>} lines
   * @param {Object} [buyer] - optional { email } to prefill the store's checkout
   */
  async startCheckout(lines, { buyer = null } = {}) {
    const endpoint = await this.endpoint();
    const checkout = { line_items: toLineItems(lines) };
    if (buyer && buyer.email) checkout.buyer = { email: buyer.email };
    const result = await this.client.callTool(endpoint, 'create_checkout', { checkout });
    return summarizeCheckout(result?.checkout || result);
  }
}

function toLineItems(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ValidationError('At least one line item is required');
  }
  return lines.map(line => {
    const quantity = Number.parseInt(line.quantity, 10) || 1;
    if (!line || !line.variantId) throw new ValidationError('Each line needs a variantId');
    return { item: { id: String(line.variantId) }, quantity: Math.max(1, Math.min(quantity, 10)) };
  });
}

module.exports = {
  UcpBridge,
  normalizeProduct,
  summarizeCheckout,
};
