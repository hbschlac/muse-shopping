/**
 * Shipping Calculation Service
 * Calculates shipping costs for orders
 *
 * CURRENT: Simplified rule-based calculation
 * FUTURE: Integrate with ShipEngine, EasyPost, or retailer-specific shipping APIs
 */

const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// Simplified shipping cost rules (in cents)
const SHIPPING_RULES = {
  // Free shipping threshold
  freeShippingThreshold: 5000, // $50.00

  // Standard shipping rates by subtotal
  standardShipping: {
    under2500: 795,   // $7.95 for orders under $25
    under5000: 595,   // $5.95 for orders $25-$50
    over5000: 0,      // Free for orders over $50
  },

  // Express shipping rates
  expressShipping: {
    base: 1495,       // $14.95 base
    perItem: 200,     // $2.00 per item
  },

  // Next day shipping rates
  nextDayShipping: {
    base: 2495,       // $24.95 base
    perItem: 300,     // $3.00 per item
  },

  // Flat rate by weight estimate (future use)
  weightBased: {
    under1lb: 595,
    under3lb: 795,
    under5lb: 995,
    over5lb: 1495,
  },
};

class ShippingCalculationService {
  /**
   * Calculate shipping cost for an order
   * @param {Object} params - Shipping calculation parameters
   * @param {number} params.subtotalCents - Order subtotal in cents
   * @param {number} params.itemCount - Number of items
   * @param {Object} params.shippingAddress - Shipping address
   * @param {string} params.shippingMethod - Shipping method (standard, express, next_day)
   * @param {number} params.storeId - Store ID (for store-specific rules)
   * @returns {Promise<Object>} Shipping calculation result
   */
  static async calculateShipping(params) {
    const {
      subtotalCents,
      itemCount = 1,
      shippingAddress,
      shippingMethod = 'standard',
      storeId = null,
    } = params;

    // Validate inputs
    if (!subtotalCents || subtotalCents < 0) {
      throw new ValidationError('Valid subtotal is required');
    }

    if (!shippingAddress || !shippingAddress.country) {
      throw new ValidationError('Shipping address with country is required');
    }

    try {
      const country = String(shippingAddress.country).toUpperCase();
      const method = String(shippingMethod).toLowerCase();

      // Only calculate shipping for US orders (for now)
      if (country !== 'US') {
        logger.info(`Shipping calculation for international order (${country})`);
        return {
          shippingCents: 2995, // $29.95 international flat rate
          method: 'international',
          carrier: 'USPS',
          estimatedDays: { min: 7, max: 14 },
          note: 'International shipping flat rate',
        };
      }

      let shippingCents = 0;
      let estimatedDays = { min: 5, max: 8 };
      let carrier = 'USPS';

      // Calculate based on shipping method
      switch (method) {
        case 'standard':
          shippingCents = this.calculateStandardShipping(subtotalCents);
          estimatedDays = { min: 5, max: 8 };
          carrier = 'USPS';
          break;

        case 'express':
          shippingCents = this.calculateExpressShipping(itemCount);
          estimatedDays = { min: 2, max: 3 };
          carrier = 'UPS';
          break;

        case 'next_day':
        case 'overnight':
          shippingCents = this.calculateNextDayShipping(itemCount);
          estimatedDays = { min: 1, max: 1 };
          carrier = 'FedEx';
          break;

        default:
          logger.warn(`Unknown shipping method: ${method}, defaulting to standard`);
          shippingCents = this.calculateStandardShipping(subtotalCents);
          estimatedDays = { min: 5, max: 8 };
          carrier = 'USPS';
      }

      logger.info(
        `Shipping calculated: $${shippingCents / 100} for ${method} method (${itemCount} items, $${subtotalCents / 100} subtotal)`
      );

      return {
        shippingCents,
        method,
        carrier,
        estimatedDays,
        estimatedDelivery: this.calculateEstimatedDelivery(estimatedDays),
        isFree: shippingCents === 0,
        freeShippingEligible: subtotalCents >= SHIPPING_RULES.freeShippingThreshold,
        amountToFreeShipping:
          subtotalCents < SHIPPING_RULES.freeShippingThreshold
            ? SHIPPING_RULES.freeShippingThreshold - subtotalCents
            : 0,
        provider: 'simplified',
      };
    } catch (error) {
      logger.error('Shipping calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate standard shipping cost
   * @param {number} subtotalCents - Order subtotal
   * @returns {number} Shipping cost in cents
   */
  static calculateStandardShipping(subtotalCents) {
    if (subtotalCents >= SHIPPING_RULES.freeShippingThreshold) {
      return 0; // Free shipping
    }

    if (subtotalCents < 2500) {
      return SHIPPING_RULES.standardShipping.under2500;
    }

    if (subtotalCents < SHIPPING_RULES.freeShippingThreshold) {
      return SHIPPING_RULES.standardShipping.under5000;
    }

    return 0;
  }

  /**
   * Calculate express shipping cost
   * @param {number} itemCount - Number of items
   * @returns {number} Shipping cost in cents
   */
  static calculateExpressShipping(itemCount) {
    return SHIPPING_RULES.expressShipping.base + itemCount * SHIPPING_RULES.expressShipping.perItem;
  }

  /**
   * Calculate next day shipping cost
   * @param {number} itemCount - Number of items
   * @returns {number} Shipping cost in cents
   */
  static calculateNextDayShipping(itemCount) {
    return SHIPPING_RULES.nextDayShipping.base + itemCount * SHIPPING_RULES.nextDayShipping.perItem;
  }

  /**
   * Calculate shipping for multiple stores
   * @param {Array} orders - Array of order objects
   * @returns {Promise<Object>} Per-store shipping breakdown
   */
  static async calculateShippingForMultipleStores(orders) {
    const results = {};

    for (const order of orders) {
      try {
        const shipping = await this.calculateShipping({
          subtotalCents: order.subtotalCents,
          itemCount: order.itemCount,
          shippingAddress: order.shippingAddress,
          shippingMethod: order.shippingMethod || 'standard',
          storeId: order.storeId,
        });

        results[order.storeId] = shipping;
      } catch (error) {
        logger.error(`Shipping calculation failed for store ${order.storeId}:`, error);
        results[order.storeId] = {
          error: error.message,
          shippingCents: 0,
        };
      }
    }

    return results;
  }

  /**
   * Get available shipping methods for an order
   * @param {Object} params - Order parameters
   * @returns {Array} Available shipping methods with costs
   */
  static async getAvailableShippingMethods(params) {
    const { subtotalCents, itemCount, shippingAddress } = params;

    const methods = [
      {
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-8 business days',
        cost: await this.calculateShipping({
          ...params,
          shippingMethod: 'standard',
        }),
      },
      {
        id: 'express',
        name: 'Express Shipping',
        description: '2-3 business days',
        cost: await this.calculateShipping({
          ...params,
          shippingMethod: 'express',
        }),
      },
      {
        id: 'next_day',
        name: 'Next Day Shipping',
        description: '1 business day',
        cost: await this.calculateShipping({
          ...params,
          shippingMethod: 'next_day',
        }),
      },
    ];

    return methods;
  }

  /**
   * Calculate estimated delivery date
   * @param {Object} estimatedDays - Min and max days
   * @returns {Object} Delivery date range
   */
  static calculateEstimatedDelivery(estimatedDays) {
    const today = new Date();
    const minDate = new Date(today);
    const maxDate = new Date(today);

    // Add business days (skip weekends)
    let daysAdded = 0;
    while (daysAdded < estimatedDays.min) {
      minDate.setDate(minDate.getDate() + 1);
      if (minDate.getDay() !== 0 && minDate.getDay() !== 6) {
        daysAdded++;
      }
    }

    daysAdded = 0;
    while (daysAdded < estimatedDays.max) {
      maxDate.setDate(maxDate.getDate() + 1);
      if (maxDate.getDay() !== 0 && maxDate.getDay() !== 6) {
        daysAdded++;
      }
    }

    return {
      minDate: minDate.toISOString().split('T')[0],
      maxDate: maxDate.toISOString().split('T')[0],
      formatted: `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    };
  }

  /**
   * Format shipping amount for display
   * @param {number} shippingCents - Shipping cost in cents
   * @returns {string} Formatted shipping cost
   */
  static formatShippingAmount(shippingCents) {
    if (shippingCents === 0) {
      return 'FREE';
    }
    return `$${(shippingCents / 100).toFixed(2)}`;
  }

  /**
   * Check if enhanced shipping calculation is available
   * Returns true if ShipEngine/EasyPost is configured
   * @returns {boolean}
   */
  static isEnhancedShippingAvailable() {
    // TODO: Check if ShipEngine or EasyPost API keys are configured
    return false;
  }
}

module.exports = ShippingCalculationService;
