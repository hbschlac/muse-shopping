/**
 * Requirement Adapter Service
 *
 * Centralizes configurable cart/checkout requirement enforcement so product
 * requirement changes can be implemented by policy/config updates.
 */

const pool = require('../db/pool');
const { ValidationError } = require('../utils/errors');
const { requirementAdapterPolicy } = require('../config/requirementAdapters');

class RequirementAdapterService {
  /**
   * Return active policy snapshot for diagnostics and API responses.
   */
  static getPolicySnapshot() {
    return requirementAdapterPolicy;
  }

  static normalizeStoreId(storeId) {
    const parsed = parseInt(storeId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  static normalizeProductType(productType) {
    if (!productType) {
      return null;
    }

    return String(productType).trim().toUpperCase();
  }

  static extractItemProductType(item = {}) {
    return this.normalizeProductType(
      item.productType ||
      item.product_type ||
      item.metadata?.productType ||
      item.metadata?.product_type ||
      item.metadata?.category
    );
  }

  static evaluateStorePolicy(storeId, policy) {
    const normalizedStoreId = this.normalizeStoreId(storeId);
    if (!normalizedStoreId) {
      return null;
    }

    const allowed = policy.allowedStoreIds || [];
    const blocked = policy.blockedStoreIds || [];

    if (blocked.includes(normalizedStoreId)) {
      return 'store_blocked';
    }

    if (allowed.length > 0 && !allowed.includes(normalizedStoreId)) {
      return 'store_not_allowed';
    }

    return null;
  }

  static evaluateProductTypePolicy(productType, policy) {
    const normalizedType = this.normalizeProductType(productType);
    if (!normalizedType) {
      return null;
    }

    const allowed = policy.allowedProductTypes || [];
    const blocked = policy.blockedProductTypes || [];

    if (blocked.includes(normalizedType)) {
      return 'product_type_blocked';
    }

    if (allowed.length > 0 && !allowed.includes(normalizedType)) {
      return 'product_type_not_allowed';
    }

    return null;
  }

  /**
   * Ensure an item currency is currently allowed.
   */
  static assertCurrencyAllowed(currency = 'USD') {
    const normalizedCurrency = String(currency || 'USD').toUpperCase();
    const allowed = requirementAdapterPolicy.cart.allowedCurrencies;

    if (!allowed.includes(normalizedCurrency)) {
      throw new ValidationError(
        `Currency ${normalizedCurrency} is not currently supported for cart items`
      );
    }
  }

  /**
   * Ensure a target item quantity is within configured limits.
   */
  static assertItemQuantityAllowed(quantity) {
    const max = requirementAdapterPolicy.cart.maxQuantityPerItem;
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > max) {
      throw new ValidationError(`Quantity must be between 1 and ${max}`);
    }
  }

  /**
   * Ensure store rules permit this store for cart interactions.
   */
  static assertStoreAllowedForCart(storeId) {
    const result = this.evaluateStorePolicy(storeId, requirementAdapterPolicy.cart);
    if (result === 'store_blocked') {
      throw new ValidationError(`Store ${storeId} is not allowed in cart`);
    }

    if (result === 'store_not_allowed') {
      throw new ValidationError(`Store ${storeId} is outside allowed cart stores`);
    }
  }

  /**
   * Ensure product-type rules permit this type for cart interactions.
   */
  static assertProductTypeAllowedForCart(productType) {
    const result = this.evaluateProductTypePolicy(productType, requirementAdapterPolicy.cart);

    if (result === 'product_type_blocked') {
      throw new ValidationError(`Product type ${productType} is blocked for cart`);
    }

    if (result === 'product_type_not_allowed') {
      throw new ValidationError(`Product type ${productType} is not currently allowed for cart`);
    }
  }

  /**
   * Ensure cart-level capacity allows adding more quantity.
   */
  static async assertCartCapacity(userId, quantityToAdd = 0, distinctItemsToAdd = 0) {
    if (quantityToAdd <= 0 && distinctItemsToAdd <= 0) {
      return;
    }

    const result = await pool.query(
      `SELECT
         COALESCE(SUM(quantity), 0) AS total_quantity,
         COUNT(*) AS distinct_items
       FROM cart_items
       WHERE user_id = $1`,
      [userId]
    );

    const currentTotalQuantity = parseInt(result.rows[0].total_quantity, 10) || 0;
    const currentDistinctItems = parseInt(result.rows[0].distinct_items, 10) || 0;

    const nextTotalQuantity = currentTotalQuantity + quantityToAdd;
    const nextDistinctItems = currentDistinctItems + distinctItemsToAdd;

    if (nextTotalQuantity > requirementAdapterPolicy.cart.maxTotalQuantity) {
      throw new ValidationError(
        `Cart total quantity cannot exceed ${requirementAdapterPolicy.cart.maxTotalQuantity}`
      );
    }

    if (nextDistinctItems > requirementAdapterPolicy.cart.maxDistinctItems) {
      throw new ValidationError(
        `Cart cannot contain more than ${requirementAdapterPolicy.cart.maxDistinctItems} distinct items`
      );
    }
  }

  /**
   * Build informational cart requirement state for UI and diagnostics.
   */
  static buildCartRequirementState(summary) {
    const policy = requirementAdapterPolicy.cart;
    const warningRatio = Math.max(1, Math.min(99, policy.warnAtPercentOfLimit)) / 100;

    const quantityWarningThreshold = Math.floor(policy.maxTotalQuantity * warningRatio);
    const distinctWarningThreshold = Math.floor(policy.maxDistinctItems * warningRatio);

    const warnings = [];

    if ((summary.totalItemCount || 0) >= quantityWarningThreshold) {
      warnings.push('approaching_total_quantity_limit');
    }

    if ((summary.totalDistinctItems || 0) >= distinctWarningThreshold) {
      warnings.push('approaching_distinct_item_limit');
    }

    return {
      policy,
      warnings,
    };
  }

  /**
   * Evaluate checkout-level requirement adapters without throwing.
   */
  static evaluateCheckoutCart(cart) {
    const policy = requirementAdapterPolicy.checkout;
    const blockers = [];
    const warnings = [];
    const details = {
      storeRules: [],
      productTypeRules: [],
    };

    const stores = cart?.stores || [];
    const subtotalCents = cart?.summary?.subtotalCents || 0;

    if (stores.length > policy.maxStoresPerCheckout) {
      blockers.push('max_stores_exceeded');
    }

    if (subtotalCents > policy.maxSubtotalCents) {
      blockers.push('max_subtotal_exceeded');
    }

    for (const store of stores) {
      const storeId = this.normalizeStoreId(store.storeId);
      const storeRule = this.evaluateStorePolicy(storeId, policy);

      if (storeRule) {
        blockers.push(storeRule);
        details.storeRules.push({ storeId, code: storeRule });
      }

      for (const item of store.items || []) {
        const productType = this.extractItemProductType(item);
        const productTypeRule = this.evaluateProductTypePolicy(productType, policy);

        if (productTypeRule) {
          blockers.push(productTypeRule);
          details.productTypeRules.push({
            storeId,
            itemId: item.id || null,
            productType,
            code: productTypeRule,
          });
        }
      }
    }

    if (policy.requireItemsInStock) {
      const hasOutOfStock = stores.some(store =>
        (store.items || []).some(item => item.inStock === false)
      );

      if (hasOutOfStock) {
        blockers.push('out_of_stock_items_present');
      }
    } else {
      const hasOutOfStock = stores.some(store =>
        (store.items || []).some(item => item.inStock === false)
      );

      if (hasOutOfStock) {
        warnings.push('out_of_stock_items_present');
      }
    }

    const uniqueBlockers = Array.from(new Set(blockers));
    const uniqueWarnings = Array.from(new Set(warnings));

    return {
      policy,
      blockers: uniqueBlockers,
      warnings: uniqueWarnings,
      details,
      passed: uniqueBlockers.length === 0,
    };
  }

  /**
   * Enforce checkout-level requirement adapters.
   */
  static enforceCheckoutCart(cart) {
    const evaluation = this.evaluateCheckoutCart(cart);

    if (!evaluation.passed) {
      throw new ValidationError(
        `Checkout requirements not satisfied: ${evaluation.blockers.join(', ')}`,
        {
          blockers: evaluation.blockers,
          details: evaluation.details,
          policy: evaluation.policy,
        }
      );
    }

    return evaluation;
  }
}

module.exports = RequirementAdapterService;
