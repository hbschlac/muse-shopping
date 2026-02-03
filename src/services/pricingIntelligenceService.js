/**
 * Pricing Intelligence Service
 * Computes best prices, price ranges, and highlights savings across retailers
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class PricingIntelligenceService {
  /**
   * Get pricing intelligence for a product (across all retailers)
   * @param {number} matchGroupId - Product match group ID
   * @returns {Promise<Object>} Pricing intelligence
   */
  static async getPricingForMatchGroup(matchGroupId) {
    const query = `
      SELECT
        pc.id,
        pc.product_name,
        pc.price_cents,
        pc.original_price_cents,
        pc.is_available,
        pc.product_url,
        pc.affiliate_link,
        s.id as store_id,
        s.name as store_name,
        s.logo_url as store_logo,
        b.id as brand_id,
        b.name as brand_name
      FROM product_catalog pc
      LEFT JOIN stores s ON pc.store_id = s.id
      LEFT JOIN brands b ON pc.brand_id = b.id
      WHERE pc.match_group_id = $1
        AND pc.is_available = true
      ORDER BY pc.price_cents ASC
    `;

    const result = await pool.query(query, [matchGroupId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this._computePricingIntelligence(result.rows);
  }

  /**
   * Get pricing intelligence for a single product
   * @param {number} productId - Product catalog ID
   * @returns {Promise<Object>} Pricing intelligence
   */
  static async getPricingForProduct(productId) {
    // First get the match group ID for this product
    const matchGroupQuery = `
      SELECT match_group_id FROM product_catalog WHERE id = $1
    `;
    const matchResult = await pool.query(matchGroupQuery, [productId]);

    if (matchResult.rows.length === 0 || !matchResult.rows[0].match_group_id) {
      // No match group - just return this single product's pricing
      const singleQuery = `
        SELECT
          pc.id,
          pc.product_name,
          pc.price_cents,
          pc.original_price_cents,
          pc.is_available,
          pc.product_url,
          pc.affiliate_link,
          s.id as store_id,
          s.name as store_name,
          s.logo_url as store_logo,
          b.id as brand_id,
          b.name as brand_name
        FROM product_catalog pc
        LEFT JOIN stores s ON pc.store_id = s.id
        LEFT JOIN brands b ON pc.brand_id = b.id
        WHERE pc.id = $1
      `;

      const result = await pool.query(singleQuery, [productId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this._computePricingIntelligence(result.rows);
    }

    // Has match group - get all offers
    return this.getPricingForMatchGroup(matchResult.rows[0].match_group_id);
  }

  /**
   * Compute pricing intelligence from product offers
   * @private
   * @param {Array} offers - Array of product offers
   * @returns {Object} Pricing intelligence
   */
  static _computePricingIntelligence(offers) {
    if (offers.length === 0) {
      return null;
    }

    // Filter to available offers
    const availableOffers = offers.filter(o => o.is_available);

    if (availableOffers.length === 0) {
      return {
        available: false,
        offers: []
      };
    }

    // Get prices
    const prices = availableOffers.map(o => o.price_cents);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Find best offer (lowest price)
    const bestOffer = availableOffers.find(o => o.price_cents === minPrice);

    // Calculate savings
    const maxSavings = availableOffers.reduce((max, offer) => {
      if (offer.original_price_cents && offer.original_price_cents > offer.price_cents) {
        const savings = offer.original_price_cents - offer.price_cents;
        return Math.max(max, savings);
      }
      return max;
    }, 0);

    // Determine display price
    let displayPrice;
    let priceType;

    if (minPrice === maxPrice) {
      // All offers same price
      displayPrice = this._formatPrice(minPrice);
      priceType = 'fixed';
    } else {
      // Range of prices
      displayPrice = `${this._formatPrice(minPrice)} - ${this._formatPrice(maxPrice)}`;
      priceType = 'range';
    }

    // Sort offers by price
    const sortedOffers = availableOffers.sort((a, b) => a.price_cents - b.price_cents);

    return {
      available: true,
      price_type: priceType,
      display_price: displayPrice,
      min_price_cents: minPrice,
      max_price_cents: maxPrice,
      min_price_formatted: this._formatPrice(minPrice),
      max_price_formatted: this._formatPrice(maxPrice),
      best_offer: {
        id: bestOffer.id,
        store_id: bestOffer.store_id,
        store_name: bestOffer.store_name,
        store_logo: bestOffer.store_logo,
        price_cents: bestOffer.price_cents,
        price_formatted: this._formatPrice(bestOffer.price_cents),
        original_price_cents: bestOffer.original_price_cents,
        original_price_formatted: bestOffer.original_price_cents
          ? this._formatPrice(bestOffer.original_price_cents)
          : null,
        savings_cents: bestOffer.original_price_cents
          ? bestOffer.original_price_cents - bestOffer.price_cents
          : 0,
        savings_formatted: bestOffer.original_price_cents
          ? this._formatPrice(bestOffer.original_price_cents - bestOffer.price_cents)
          : null,
        product_url: bestOffer.product_url,
        affiliate_link: bestOffer.affiliate_link
      },
      max_savings_cents: maxSavings,
      max_savings_formatted: maxSavings > 0 ? this._formatPrice(maxSavings) : null,
      num_retailers: sortedOffers.length,
      offers: sortedOffers.map(offer => ({
        id: offer.id,
        store_id: offer.store_id,
        store_name: offer.store_name,
        store_logo: offer.store_logo,
        price_cents: offer.price_cents,
        price_formatted: this._formatPrice(offer.price_cents),
        original_price_cents: offer.original_price_cents,
        original_price_formatted: offer.original_price_cents
          ? this._formatPrice(offer.original_price_cents)
          : null,
        savings_cents: offer.original_price_cents
          ? offer.original_price_cents - offer.price_cents
          : 0,
        savings_formatted: offer.original_price_cents
          ? this._formatPrice(offer.original_price_cents - offer.price_cents)
          : null,
        is_best_price: offer.price_cents === minPrice,
        product_url: offer.product_url,
        affiliate_link: offer.affiliate_link
      }))
    };
  }

  /**
   * Get price history for a product
   * @param {number} productId - Product catalog ID
   * @param {number} days - Number of days to look back (default 30)
   * @returns {Promise<Array>} Price history
   */
  static async getPriceHistory(productId, days = 30) {
    const query = `
      SELECT
        price_cents,
        original_price_cents,
        detected_at,
        update_source
      FROM product_price_history
      WHERE product_catalog_id = $1
        AND detected_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      ORDER BY detected_at ASC
    `;

    const result = await pool.query(query, [productId]);

    return result.rows.map(row => ({
      price_cents: row.price_cents,
      price_formatted: this._formatPrice(row.price_cents),
      original_price_cents: row.original_price_cents,
      detected_at: row.detected_at,
      update_source: row.update_source
    }));
  }

  /**
   * Detect if product is on sale
   * @param {number} productId - Product catalog ID
   * @returns {Promise<Object>} Sale information
   */
  static async detectSale(productId) {
    const query = `
      SELECT
        pc.price_cents,
        pc.original_price_cents,
        pc.product_name,
        pc.updated_at,
        (
          SELECT price_cents
          FROM product_price_history
          WHERE product_catalog_id = pc.id
          ORDER BY detected_at DESC
          LIMIT 1 OFFSET 1
        ) as previous_price
      FROM product_catalog pc
      WHERE pc.id = $1
    `;

    const result = await pool.query(query, [productId]);

    if (result.rows.length === 0) {
      return null;
    }

    const product = result.rows[0];
    const currentPrice = product.price_cents;
    const originalPrice = product.original_price_cents;
    const previousPrice = product.previous_price;

    const isSale = originalPrice && currentPrice < originalPrice;
    const isPriceDrop = previousPrice && currentPrice < previousPrice;

    const savingsFromOriginal = isSale ? originalPrice - currentPrice : 0;
    const savingsFromPrevious = isPriceDrop ? previousPrice - currentPrice : 0;

    return {
      product_id: productId,
      product_name: product.product_name,
      current_price_cents: currentPrice,
      current_price_formatted: this._formatPrice(currentPrice),
      is_on_sale: isSale,
      is_price_drop: isPriceDrop,
      original_price_cents: originalPrice,
      original_price_formatted: originalPrice ? this._formatPrice(originalPrice) : null,
      savings_cents: Math.max(savingsFromOriginal, savingsFromPrevious),
      savings_formatted: Math.max(savingsFromOriginal, savingsFromPrevious) > 0
        ? this._formatPrice(Math.max(savingsFromOriginal, savingsFromPrevious))
        : null,
      discount_percent: isSale
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : null,
      last_updated: product.updated_at
    };
  }

  /**
   * Format price in cents to dollars
   * @private
   * @param {number} cents - Price in cents
   * @returns {string} Formatted price
   */
  static _formatPrice(cents) {
    const dollars = cents / 100;
    return `$${dollars.toFixed(2)}`;
  }

  /**
   * Batch get pricing for multiple products
   * @param {Array<number>} productIds - Array of product IDs
   * @returns {Promise<Object>} Map of productId -> pricing
   */
  static async batchGetPricing(productIds) {
    const results = {};

    await Promise.all(
      productIds.map(async (productId) => {
        results[productId] = await this.getPricingForProduct(productId);
      })
    );

    return results;
  }
}

module.exports = PricingIntelligenceService;
