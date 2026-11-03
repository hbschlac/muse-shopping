/**
 * Bridge cart: put partner-store products (stores reached through
 * src/services/agentBridges, e.g. Shopify stores over UCP) in the Muse cart,
 * and check them out at each store.
 *
 * How it works:
 *   - addItem re-reads the product live from the store, so the price, size and
 *     stock in the cart are what the store says right now. The cart line keeps
 *     the store's variant id in metadata.bridge.
 *   - startCheckout groups the shopper's bridge lines by store, builds one
 *     checkout at each store (create_checkout), refreshes cart prices from the
 *     store's answer, and returns each store's continue_url.
 *   - Muse never charges for these lines. The shopper pays on the store's own
 *     checkout page, and the store is the merchant of record.
 *
 * Bridge stores get a row in `stores` (slug "bridge-<partner key>",
 * integration_type 'ucp') so the existing cart grouping and checkout readiness
 * code treat them like any other store.
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');
const AgentBridges = require('./agentBridges');
const CartService = require('./cartService');

const CHECKOUT_TIMEOUT_MS = 10000;

function storeSlug(partnerKey) {
  return `bridge-${partnerKey}`;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function optionValue(options, names) {
  if (!options) return null;
  const key = Object.keys(options).find(k => names.includes(k.toLowerCase()));
  return key ? options[key] : null;
}

function clean(value, max) {
  const v = String(value ?? '').trim();
  return v ? v.slice(0, max) : null;
}

/**
 * Accepts the shapes Muse already uses ({ name, address1, address2, city, state,
 * zip, country, phone }); returns null when required parts are missing.
 */
function normalizeAddress(input) {
  if (!input) return null;
  const firstLast = [input.firstName, input.lastName].filter(Boolean).join(' ');
  const address = {
    name: clean(input.name || firstLast, 255),
    address1: clean(input.address1 || input.line1 || input.street, 255),
    address2: clean(input.address2 || input.line2, 255),
    city: clean(input.city, 100),
    state: clean(input.state || input.region, 50),
    zip: clean(input.zip || input.postalCode || input.postal_code, 20),
    country: (clean(input.country, 2) || 'US').toUpperCase(),
    phone: clean(input.phone, 50),
  };
  if (!address.name || !address.address1 || !address.city || !address.state || !address.zip) return null;
  return address;
}

// What the cart page shows; no phone.
function publicAddress(a) {
  return { name: a.name, address1: a.address1, address2: a.address2, city: a.city, state: a.state, zip: a.zip, country: a.country };
}

class BridgeCartService {
  /**
   * Find or create the `stores` row for a bridge partner.
   * @returns {Promise<{id: number, name: string, slug: string}>}
   */
  static async ensureStore(partner) {
    const slug = storeSlug(partner.key);
    const existing = await pool.query('SELECT id, name, slug FROM stores WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) return existing.rows[0];

    const metadata = JSON.stringify({
      bridge: { partnerKey: partner.key, protocol: partner.protocol, platform: partner.platform || null },
    });
    const insert = (name) => pool.query(
      `INSERT INTO stores (name, slug, display_name, website_url, integration_type,
                           supports_checkout, supports_cart_api, category, is_active, metadata)
       VALUES ($1, $2, $3, $4, 'ucp', true, true, $5, true, $6)
       ON CONFLICT DO NOTHING
       RETURNING id, name, slug`,
      [name, slug, partner.name, `https://${partner.domain}`, partner.category || 'fashion', metadata]
    );

    // `stores.name` is unique too. If another store already uses the partner's
    // name (e.g. a retired scraper store), keep that row and add a distinct one.
    let result = await insert(partner.name);
    if (result.rows.length === 0) {
      result = await insert(`${partner.name} (${partner.domain})`);
    }
    if (result.rows.length > 0) return result.rows[0];

    // Lost a race with a concurrent insert of the same slug.
    const again = await pool.query('SELECT id, name, slug FROM stores WHERE slug = $1', [slug]);
    if (again.rows.length === 0) {
      throw new Error(`Could not create a store row for bridge partner ${partner.key}`);
    }
    return again.rows[0];
  }

  /**
   * Add a partner-store product to the Muse cart, priced live by the store.
   * @param {number} userId
   * @param {Object} input
   * @param {string} input.partnerKey - partner key from partners.json
   * @param {string} input.productId - the store's product id (e.g. gid://shopify/Product/1)
   * @param {string} [input.variantId] - required when the product has more than one variant
   * @param {number} [input.quantity]
   */
  static async addItem(userId, { partnerKey, productId, variantId = null, quantity = 1 } = {}) {
    if (!partnerKey || !productId) {
      throw new ValidationError('partnerKey and productId are required');
    }

    const partner = AgentBridges.getPartner(partnerKey);
    if (!partner.canCheckout) {
      throw new ValidationError(`${partner.name} does not offer agent checkout yet`);
    }

    const product = await AgentBridges.getBridge(partnerKey).getProduct(productId);
    if (!product) throw new NotFoundError(`Product ${productId} at ${partner.name}`);

    const variants = product.variants || [];
    let variant = null;
    if (variantId) {
      variant = variants.find(v => v.id === variantId);
      if (!variant) throw new ValidationError(`Variant ${variantId} is not part of this product`);
    } else if (variants.length === 1) {
      variant = variants[0];
    } else {
      throw new ValidationError('Choose a size or color (variantId) before adding to cart');
    }

    if (variant.available === false) {
      throw new ValidationError(`${product.title}${variant.title ? ` (${variant.title})` : ''} is sold out at ${partner.name}`);
    }

    const price = variant.price || product.price;
    if (!price || typeof price.cents !== 'number') {
      throw new ValidationError(`${partner.name} did not return a price for this item`);
    }

    const store = await this.ensureStore(partner);

    return CartService.addItem(userId, {
      storeId: store.id,
      brandId: null,
      productName: product.title,
      productSku: variant.id,
      productUrl: product.url || `https://${partner.domain}`,
      productImageUrl: variant.imageUrl || product.imageUrl,
      productDescription: product.description ? product.description.slice(0, 2000) : null,
      priceCents: price.cents,
      originalPriceCents: product.compareAtPrice ? product.compareAtPrice.cents : price.cents,
      currency: price.currency || 'USD',
      size: optionValue(variant.options, ['size']),
      color: optionValue(variant.options, ['color', 'colour']),
      quantity,
      inStock: true,
      metadata: {
        bridge: {
          partnerKey: partner.key,
          productId: product.id,
          variantId: variant.id,
          variantTitle: variant.title || null,
        },
      },
    });
  }

  /**
   * The shopper's bridge cart lines, grouped by partner store.
   * @returns {Promise<Map<string, Array>>}
   */
  static async getBridgeLines(userId) {
    const result = await pool.query(
      `SELECT ci.id, ci.store_id, ci.product_name, ci.product_sku, ci.quantity,
              ci.price_cents, ci.metadata, s.name AS store_name
       FROM cart_items ci
       JOIN stores s ON s.id = ci.store_id
       WHERE ci.user_id = $1
         AND ci.metadata ? 'bridge'
       ORDER BY ci.added_at ASC`,
      [userId]
    );

    const byPartner = new Map();
    for (const row of result.rows) {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
      const bridge = meta.bridge || {};
      if (!bridge.partnerKey || !bridge.variantId) continue;
      if (!byPartner.has(bridge.partnerKey)) byPartner.set(bridge.partnerKey, []);
      byPartner.get(bridge.partnerKey).push({ ...row, bridge });
    }
    return byPartner;
  }

  /**
   * Build a checkout at every partner store in the shopper's cart.
   * @param {number} userId
   * @param {Object} [opts]
   * @param {string} [opts.email] - prefill the store's checkout; defaults to the account email
   * @param {Object} [opts.shippingAddress] - defaults to the shopper's saved default address
   * @param {string[]} [opts.partnerKeys] - only these stores
   * @returns {Promise<{stores: Array, errors: Array}>}
   */
  static async startCheckout(userId, { email = null, shippingAddress = null, partnerKeys = null } = {}) {
    const byPartner = await this.getBridgeLines(userId);
    let keys = [...byPartner.keys()];
    if (Array.isArray(partnerKeys) && partnerKeys.length) {
      keys = keys.filter(k => partnerKeys.includes(k));
    }
    if (keys.length === 0) {
      throw new ValidationError('There are no partner-store items in your cart');
    }

    let buyerEmail = email;
    if (!buyerEmail) {
      const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      buyerEmail = user.rows[0]?.email || null;
    }

    // Fill in the store's checkout for the shopper: the store gets the address,
    // picks a delivery option and returns real shipping and tax.
    const address = shippingAddress
      ? normalizeAddress(shippingAddress)
      : await this.getShippingAddress(userId);

    const settled = await Promise.allSettled(keys.map(key => {
      const lines = byPartner.get(key).map(l => ({ variantId: l.bridge.variantId, quantity: l.quantity }));
      return withTimeout(
        AgentBridges.getBridge(key).startCheckout(lines, {
          buyer: buyerEmail ? { email: buyerEmail } : null,
          shippingAddress: address,
        }),
        CHECKOUT_TIMEOUT_MS,
        key
      );
    }));

    const stores = [];
    const errors = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const lines = byPartner.get(key);
      const outcome = settled[i];
      if (outcome.status !== 'fulfilled' || !outcome.value?.continueUrl) {
        const message = outcome.status === 'fulfilled'
          ? 'The store did not return a checkout link'
          : (outcome.reason?.message || 'failed');
        logger.warn(`Bridge checkout failed for ${key}: ${message}`);
        errors.push({ partnerKey: key, storeName: lines[0].store_name, message });
        continue;
      }

      const checkout = outcome.value;
      await this.recordCheckout(lines, checkout);
      stores.push({
        partnerKey: key,
        prefilled: !!address && !checkout.prefillError,
        storeId: lines[0].store_id,
        storeName: lines[0].store_name,
        itemCount: lines.reduce((n, l) => n + l.quantity, 0),
        checkout,
      });
    }

    logger.info(`Bridge checkout for user ${userId}: ${stores.length} store(s) ready, ${errors.length} failed`);
    return { stores, errors, shipTo: address ? publicAddress(address) : null };
  }

  /**
   * The shopper's default shipping address: their saved default, else the
   * address from their last Muse checkout. Null when Muse has none.
   */
  static async getShippingAddress(userId) {
    const saved = await pool.query(
      `SELECT name, address1, address2, city, state, zip, country, phone
       FROM user_saved_addresses
       WHERE user_id = $1 AND is_active = true AND address_type IN ('shipping', 'both')
       ORDER BY is_default DESC, updated_at DESC NULLS LAST, id DESC
       LIMIT 1`,
      [userId]
    );
    if (saved.rows[0]) return normalizeAddress(saved.rows[0]);

    const last = await pool.query(
      `SELECT shipping_address FROM checkout_sessions
       WHERE user_id = $1 AND shipping_address IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const fromCheckout = last.rows[0]?.shipping_address;
    return fromCheckout ? normalizeAddress(typeof fromCheckout === 'string' ? JSON.parse(fromCheckout) : fromCheckout) : null;
  }

  /**
   * Save the shopper's default shipping address (used to fill in store checkouts).
   */
  static async saveShippingAddress(userId, input) {
    const address = normalizeAddress(input);
    if (!address) {
      throw new ValidationError('Name, street address, city, state and ZIP are required');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE user_saved_addresses SET is_default = false
         WHERE user_id = $1 AND address_type IN ('shipping', 'both')`,
        [userId]
      );
      await client.query(
        `INSERT INTO user_saved_addresses
           (user_id, name, address1, address2, city, state, zip, country, phone,
            address_type, is_default, is_active, nickname, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'shipping', true, true, 'Muse', $10)`,
        [userId, address.name, address.address1, address.address2, address.city,
          address.state, address.zip, address.country, address.phone,
          JSON.stringify({ source: 'muse_cart' })]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return publicAddress(address);
  }

  /**
   * Refresh cart prices from the store's checkout and remember the handoff.
   */
  static async recordCheckout(lines, checkout) {
    const livePrice = new Map(
      (checkout.lineItems || [])
        .filter(li => li.variantId && typeof li.priceCents === 'number')
        .map(li => [li.variantId, li.priceCents])
    );
    const handoff = {
      checkoutId: checkout.id || null,
      status: checkout.status || null,
      continueUrl: checkout.continueUrl,
      at: new Date().toISOString(),
    };

    await Promise.all(lines.map(line => {
      const price = livePrice.get(line.bridge.variantId);
      return pool.query(
        `UPDATE cart_items
         SET price_cents = COALESCE($1, price_cents),
             metadata = jsonb_set(metadata, '{bridge,lastCheckout}', $2::jsonb, true),
             last_stock_check = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [price ?? null, JSON.stringify(handoff), line.id]
      );
    }));
  }
}

module.exports = BridgeCartService;
