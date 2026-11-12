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
const { cleanStoreText } = require('../../utils/storeText');

function money(amount) {
  if (!amount || typeof amount.amount !== 'number') return null;
  return { cents: amount.amount, currency: amount.currency || 'USD' };
}

// Store text is data, never instructions: strip markup and invisible characters.
function stripHtml(html) {
  return cleanStoreText(html, 5000) || '';
}
const text = (v, max = 500) => cleanStoreText(v, max);

/**
 * Map a UCP catalog product to Muse's bridge product shape.
 */
function normalizeProduct(product, partner) {
  const variants = (product.variants || []).map(v => ({
    id: v.id,
    sku: v.sku || null,
    title: text(v.title),
    price: money(v.price),
    available: v.availability ? !!v.availability.available : null,
    options: (v.options || []).reduce((acc, o) => {
      const name = text(o && o.name, 80);
      if (name) acc[name] = text(o.label, 200);
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
    title: text(product.title) || String(product.id),
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
      title: text(li.item?.title),
      priceCents: li.item?.price,
      imageUrl: li.item?.image_url || null,
      quantity: li.quantity,
    })),
    policies: (checkout.links || []).map(l => ({ type: l.type, title: text(l.title, 200), url: l.url })),
    // Items the shopper still has to provide on the store's page (address, contact, etc.)
    needsFromShopper: (checkout.messages || [])
      .filter(m => m.type === 'error')
      .map(m => ({ code: m.code, message: text(m.content, 1000), severity: m.severity })),
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
   * When a shipping address is given, Muse fills in the store's checkout for the
   * shopper (contact, name, address, phone) and the store picks its delivery
   * option, so the shopper only has to pay on the store's page.
   * Verified live 2026-11-03 at Allbirds: the continue_url page opened with
   * email, name, address and Standard Shipping filled in.
   *
   * @param {Array<{variantId: string, quantity: number}>} lines
   * @param {Object} [opts]
   * @param {Object} [opts.buyer] - { email, firstName, lastName, phone }
   * @param {Object} [opts.shippingAddress] - { firstName, lastName, address1, address2,
   *   city, state, zip, country, phone }
   */
  async startCheckout(lines, { buyer = null, shippingAddress = null } = {}) {
    const endpoint = await this.endpoint();
    const checkout = { line_items: toLineItems(lines) };
    const ucpBuyer = toBuyer(buyer, shippingAddress);
    if (ucpBuyer) checkout.buyer = ucpBuyer;
    const result = await this.client.callTool(endpoint, 'create_checkout', { checkout });
    const created = result?.checkout || result;

    const destination = toDestination(shippingAddress, ucpBuyer);
    if (!destination || !created?.id || !Array.isArray(created.line_items) || !created.line_items.length) {
      return summarizeCheckout(created);
    }

    // update_checkout replaces the whole checkout (PUT semantics): resend the
    // line items with their ids and the buyer along with the address.
    const lineItems = created.line_items.map(li => ({
      id: li.id,
      item: { id: li.item?.id },
      quantity: li.quantity,
    }));
    try {
      const updated = await this.client.callTool(endpoint, 'update_checkout', {
        id: created.id,
        checkout: {
          line_items: lineItems,
          ...(ucpBuyer ? { buyer: ucpBuyer } : {}),
          fulfillment: {
            methods: [{
              type: 'shipping',
              line_item_ids: lineItems.map(li => li.id),
              destinations: [destination],
            }],
          },
        },
      });
      return summarizeCheckout(updated?.checkout || updated);
    } catch (err) {
      // The checkout still exists; the shopper can enter the address at the store.
      return { ...summarizeCheckout(created), prefillError: err.message };
    }
  }
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: null, last: null };
  return { first: parts[0], last: parts.slice(1).join(' ') || null };
}

function toBuyer(buyer, address) {
  const b = buyer || {};
  const fromName = splitName(address?.name);
  const out = {};
  if (b.email) out.email = b.email;
  const first = b.firstName || address?.firstName || fromName.first;
  const last = b.lastName || address?.lastName || fromName.last;
  if (first) out.first_name = first;
  if (last) out.last_name = last;
  const phone = b.phone || address?.phone;
  if (phone) out.phone_number = phone;
  return Object.keys(out).length ? out : null;
}

/**
 * Muse address -> UCP postal address. Stores ask for a phone on the
 * destination (SKIMS returned delivery_phone_number_required without it).
 */
function toDestination(address, ucpBuyer) {
  if (!address || !address.address1 || !address.city || !address.zip) return null;
  const fromName = splitName(address.name);
  const destination = {
    first_name: address.firstName || fromName.first || ucpBuyer?.first_name || undefined,
    last_name: address.lastName || fromName.last || ucpBuyer?.last_name || undefined,
    street_address: address.address1,
    extended_address: address.address2 || undefined,
    address_locality: address.city,
    address_region: address.state || undefined,
    postal_code: String(address.zip),
    address_country: (address.country || 'US').toUpperCase(),
    phone_number: address.phone || ucpBuyer?.phone_number || undefined,
  };
  Object.keys(destination).forEach(k => destination[k] === undefined && delete destination[k]);
  return destination;
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
  toDestination,
  normalizeProduct,
  summarizeCheckout,
};
