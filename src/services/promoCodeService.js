/**
 * Promo Code Service
 * Validates and applies promo codes to checkout sessions
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

class PromoCodeService {
  /**
   * Validate and calculate discount for a promo code
   * @param {string} code - Promo code
   * @param {number} userId - User ID
   * @param {Object} cart - Cart snapshot
   * @returns {Promise<Object>} Validation result with discount
   */
  static async validatePromoCode(code, userId, cart) {
    const normalizedCode = String(code).trim().toUpperCase();

    // Fetch promo code
    const promoResult = await pool.query(
      `SELECT * FROM promo_codes
       WHERE UPPER(code) = $1 AND is_active = true`,
      [normalizedCode]
    );

    if (promoResult.rows.length === 0) {
      throw new ValidationError('Promo code not found or inactive');
    }

    const promo = promoResult.rows[0];

    // Check validity dates
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      throw new ValidationError('Promo code is not yet valid');
    }

    if (promo.valid_until && new Date(promo.valid_until) < now) {
      throw new ValidationError('Promo code has expired');
    }

    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      throw new ValidationError('Promo code has reached maximum uses');
    }

    // Check per-user usage limit
    if (promo.max_uses_per_user) {
      const userUsesResult = await pool.query(
        `SELECT COUNT(*) as use_count
         FROM promo_code_uses
         WHERE promo_code_id = $1 AND user_id = $2`,
        [promo.id, userId]
      );

      const userUses = parseInt(userUsesResult.rows[0].use_count, 10);
      if (userUses >= promo.max_uses_per_user) {
        throw new ValidationError(`You have already used this promo code ${promo.max_uses_per_user} time(s)`);
      }
    }

    // Check minimum purchase
    const cartSubtotal = cart.summary?.subtotalCents || 0;
    if (promo.min_purchase_cents && cartSubtotal < promo.min_purchase_cents) {
      const minPurchase = `$${(promo.min_purchase_cents / 100).toFixed(2)}`;
      throw new ValidationError(`Minimum purchase of ${minPurchase} required for this promo code`);
    }

    // Check store restrictions
    const eligibleStores = this.getEligibleStores(cart, promo);
    if (eligibleStores.length === 0) {
      throw new ValidationError('This promo code is not valid for items in your cart');
    }

    // Calculate discount
    const discountResult = this.calculateDiscount(promo, cart, eligibleStores);

    return {
      valid: true,
      promoCodeId: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountCents: discountResult.discountCents,
      discountDisplay: `$${(discountResult.discountCents / 100).toFixed(2)}`,
      eligibleStoreIds: eligibleStores.map(s => s.storeId),
      appliedToStores: discountResult.appliedToStores,
      message: discountResult.message,
    };
  }

  /**
   * Calculate discount amount for a promo code
   * @param {Object} promo - Promo code object
   * @param {Object} cart - Cart snapshot
   * @param {Array} eligibleStores - Stores eligible for discount
   * @returns {Object} Discount calculation
   */
  static calculateDiscount(promo, cart, eligibleStores) {
    const eligibleSubtotal = eligibleStores.reduce((sum, store) => sum + store.subtotalCents, 0);

    let discountCents = 0;
    const appliedToStores = [];

    if (promo.discount_type === 'percentage') {
      // Percentage discount
      const percentage = promo.discount_value / 100;
      discountCents = Math.round(eligibleSubtotal * percentage);

      // Apply max discount cap if set
      if (promo.max_discount_cents && discountCents > promo.max_discount_cents) {
        discountCents = promo.max_discount_cents;
      }

      // Distribute discount across eligible stores proportionally
      for (const store of eligibleStores) {
        const storeDiscount = Math.round((store.subtotalCents / eligibleSubtotal) * discountCents);
        appliedToStores.push({
          storeId: store.storeId,
          storeName: store.storeName,
          discountCents: storeDiscount,
        });
      }

      return {
        discountCents,
        appliedToStores,
        message: `${promo.discount_value}% off applied`,
      };
    } else if (promo.discount_type === 'fixed_amount') {
      // Fixed amount discount
      discountCents = Math.min(promo.discount_value, eligibleSubtotal);

      // Distribute fixed discount across eligible stores proportionally
      for (const store of eligibleStores) {
        const storeDiscount = Math.round((store.subtotalCents / eligibleSubtotal) * discountCents);
        appliedToStores.push({
          storeId: store.storeId,
          storeName: store.storeName,
          discountCents: storeDiscount,
        });
      }

      return {
        discountCents,
        appliedToStores,
        message: `$${(discountCents / 100).toFixed(2)} off applied`,
      };
    }

    return {
      discountCents: 0,
      appliedToStores: [],
      message: 'Unknown discount type',
    };
  }

  /**
   * Get eligible stores for a promo code
   * @param {Object} cart - Cart snapshot
   * @param {Object} promo - Promo code object
   * @returns {Array} Eligible stores
   */
  static getEligibleStores(cart, promo) {
    const stores = cart.stores || [];
    const eligibleStores = [];

    for (const store of stores) {
      // Check store restrictions
      if (promo.eligible_store_ids && promo.eligible_store_ids.length > 0) {
        if (!promo.eligible_store_ids.includes(store.storeId)) {
          continue; // Store not in whitelist
        }
      }

      if (promo.excluded_store_ids && promo.excluded_store_ids.includes(store.storeId)) {
        continue; // Store is excluded
      }

      // Check product type restrictions (if any items match)
      let hasEligibleItems = true;

      if (promo.eligible_product_types && promo.eligible_product_types.length > 0) {
        hasEligibleItems = (store.items || []).some(item => {
          const itemType = this.extractProductType(item);
          return promo.eligible_product_types.includes(itemType);
        });
      }

      if (promo.excluded_product_types && promo.excluded_product_types.length > 0) {
        const hasExcludedItems = (store.items || []).some(item => {
          const itemType = this.extractProductType(item);
          return promo.excluded_product_types.includes(itemType);
        });

        if (hasExcludedItems) {
          hasEligibleItems = false;
        }
      }

      if (hasEligibleItems) {
        eligibleStores.push(store);
      }
    }

    return eligibleStores;
  }

  /**
   * Extract product type from item
   * @param {Object} item - Cart item
   * @returns {string|null} Product type
   */
  static extractProductType(item) {
    return (
      item.productType ||
      item.metadata?.productType ||
      item.metadata?.product_type ||
      null
    );
  }

  /**
   * Record promo code usage
   * @param {number} promoCodeId - Promo code ID
   * @param {number} userId - User ID
   * @param {number} checkoutSessionId - Checkout session ID
   * @param {number} discountCents - Discount applied
   * @param {number} orderSubtotal - Order subtotal
   * @returns {Promise<Object>} Usage record
   */
  static async recordUsage(promoCodeId, userId, checkoutSessionId, discountCents, orderSubtotal) {
    // Record usage
    const usageResult = await pool.query(
      `INSERT INTO promo_code_uses (
        promo_code_id,
        user_id,
        checkout_session_id,
        discount_applied_cents,
        order_subtotal_cents
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [promoCodeId, userId, checkoutSessionId, discountCents, orderSubtotal]
    );

    // Increment usage counter
    await pool.query(
      `UPDATE promo_codes
       SET current_uses = current_uses + 1
       WHERE id = $1`,
      [promoCodeId]
    );

    logger.info(`Promo code ${promoCodeId} used by user ${userId}: $${discountCents / 100} off`);

    return usageResult.rows[0];
  }

  /**
   * Get all active promo codes (admin)
   * @returns {Promise<Array>} Active promo codes
   */
  static async getActivePromoCodes() {
    const result = await pool.query(
      `SELECT *,
         CASE
           WHEN max_uses IS NOT NULL THEN (max_uses - current_uses)
           ELSE NULL
         END as remaining_uses
       FROM promo_codes
       WHERE is_active = true
         AND (valid_from IS NULL OR valid_from <= NOW())
         AND (valid_until IS NULL OR valid_until >= NOW())
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Create a new promo code (admin)
   * @param {Object} promoData - Promo code data
   * @returns {Promise<Object>} Created promo code
   */
  static async createPromoCode(promoData) {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchaseCents = 0,
      maxDiscountCents = null,
      validFrom = null,
      validUntil = null,
      maxUses = null,
      maxUsesPerUser = 1,
      eligibleStoreIds = null,
      excludedStoreIds = null,
      eligibleProductTypes = null,
      excludedProductTypes = null,
      createdBy = null,
    } = promoData;

    // Validate
    if (!code || code.length < 3) {
      throw new ValidationError('Promo code must be at least 3 characters');
    }

    if (!['percentage', 'fixed_amount'].includes(discountType)) {
      throw new ValidationError('Discount type must be percentage or fixed_amount');
    }

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      throw new ValidationError('Percentage discount must be between 0 and 100');
    }

    const result = await pool.query(
      `INSERT INTO promo_codes (
        code,
        description,
        discount_type,
        discount_value,
        min_purchase_cents,
        max_discount_cents,
        valid_from,
        valid_until,
        max_uses,
        max_uses_per_user,
        eligible_store_ids,
        excluded_store_ids,
        eligible_product_types,
        excluded_product_types,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minPurchaseCents,
        maxDiscountCents,
        validFrom,
        validUntil,
        maxUses,
        maxUsesPerUser,
        eligibleStoreIds,
        excludedStoreIds,
        eligibleProductTypes,
        excludedProductTypes,
        createdBy,
      ]
    );

    logger.info(`Promo code created: ${code}`);
    return result.rows[0];
  }

  /**
   * Deactivate a promo code
   * @param {string} code - Promo code
   * @returns {Promise<Object>} Updated promo code
   */
  static async deactivatePromoCode(code) {
    const result = await pool.query(
      `UPDATE promo_codes
       SET is_active = false,
           updated_at = NOW()
       WHERE UPPER(code) = $1
       RETURNING *`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Promo code not found');
    }

    logger.info(`Promo code deactivated: ${code}`);
    return result.rows[0];
  }
}

module.exports = PromoCodeService;
