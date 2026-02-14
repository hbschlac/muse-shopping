/**
 * Tax Calculation Service
 * Calculates sales tax for orders
 *
 * CURRENT: Simplified US state-based calculation
 * FUTURE: Integrate with TaxJar or Avalara for accurate tax calculation
 */

const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// Simplified US state sales tax rates (2026 approximate)
// For production, use TaxJar or Avalara API
const US_STATE_TAX_RATES = {
  AL: 0.04,    // Alabama
  AK: 0.00,    // Alaska (no state sales tax)
  AZ: 0.056,   // Arizona
  AR: 0.065,   // Arkansas
  CA: 0.0725,  // California
  CO: 0.029,   // Colorado
  CT: 0.0635,  // Connecticut
  DE: 0.00,    // Delaware (no sales tax)
  FL: 0.06,    // Florida
  GA: 0.04,    // Georgia
  HI: 0.04,    // Hawaii
  ID: 0.06,    // Idaho
  IL: 0.0625,  // Illinois
  IN: 0.07,    // Indiana
  IA: 0.06,    // Iowa
  KS: 0.065,   // Kansas
  KY: 0.06,    // Kentucky
  LA: 0.0445,  // Louisiana
  ME: 0.055,   // Maine
  MD: 0.06,    // Maryland
  MA: 0.0625,  // Massachusetts
  MI: 0.06,    // Michigan
  MN: 0.06875, // Minnesota
  MS: 0.07,    // Mississippi
  MO: 0.04225, // Missouri
  MT: 0.00,    // Montana (no sales tax)
  NE: 0.055,   // Nebraska
  NV: 0.0685,  // Nevada
  NH: 0.00,    // New Hampshire (no sales tax)
  NJ: 0.06625, // New Jersey
  NM: 0.05125, // New Mexico
  NY: 0.04,    // New York
  NC: 0.0475,  // North Carolina
  ND: 0.05,    // North Dakota
  OH: 0.0575,  // Ohio
  OK: 0.045,   // Oklahoma
  OR: 0.00,    // Oregon (no sales tax)
  PA: 0.06,    // Pennsylvania
  RI: 0.07,    // Rhode Island
  SC: 0.06,    // South Carolina
  SD: 0.045,   // South Dakota
  TN: 0.07,    // Tennessee
  TX: 0.0625,  // Texas
  UT: 0.0485,  // Utah
  VT: 0.06,    // Vermont
  VA: 0.053,   // Virginia
  WA: 0.065,   // Washington
  WV: 0.06,    // West Virginia
  WI: 0.05,    // Wisconsin
  WY: 0.04,    // Wyoming
  DC: 0.06,    // District of Columbia
};

class TaxCalculationService {
  /**
   * Calculate sales tax for an order
   * @param {Object} params - Tax calculation parameters
   * @param {number} params.subtotalCents - Order subtotal in cents
   * @param {Object} params.shippingAddress - Shipping address
   * @param {Array} params.items - Order items (for future item-specific tax rules)
   * @returns {Promise<Object>} Tax calculation result
   */
  static async calculateTax(params) {
    const { subtotalCents, shippingAddress, items = [] } = params;

    // Validate inputs
    if (!subtotalCents || subtotalCents < 0) {
      throw new ValidationError('Valid subtotal is required');
    }

    if (!shippingAddress || !shippingAddress.state) {
      throw new ValidationError('Shipping address with state is required');
    }

    try {
      const state = String(shippingAddress.state).toUpperCase();
      const country = String(shippingAddress.country || 'US').toUpperCase();

      // Only calculate tax for US orders (for now)
      if (country !== 'US') {
        logger.info(`Tax calculation skipped for non-US country: ${country}`);
        return {
          taxCents: 0,
          taxRate: 0,
          taxableAmountCents: subtotalCents,
          taxJurisdiction: country,
          breakdown: [],
          note: 'Non-US orders: tax calculation not available',
        };
      }

      // Get state tax rate
      const stateTaxRate = US_STATE_TAX_RATES[state];

      if (stateTaxRate === undefined) {
        logger.warn(`Unknown state code: ${state}`);
        throw new ValidationError(`Invalid US state code: ${state}`);
      }

      // Calculate tax
      const taxCents = Math.round(subtotalCents * stateTaxRate);

      logger.info(`Tax calculated for ${state}: $${taxCents / 100} (${stateTaxRate * 100}%)`);

      return {
        taxCents,
        taxRate: stateTaxRate,
        taxRatePercent: stateTaxRate * 100,
        taxableAmountCents: subtotalCents,
        taxJurisdiction: `${state}, US`,
        state,
        breakdown: [
          {
            type: 'state',
            jurisdiction: state,
            rate: stateTaxRate,
            amountCents: taxCents,
          },
        ],
        note: 'Simplified state-level tax calculation. Does not include local/county taxes.',
        provider: 'simplified',
      };
    } catch (error) {
      logger.error('Tax calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate tax for multiple stores/orders
   * @param {Array} orders - Array of order objects with subtotal and shipping address
   * @returns {Promise<Object>} Per-store tax breakdown
   */
  static async calculateTaxForMultipleStores(orders) {
    const results = {};

    for (const order of orders) {
      try {
        const tax = await this.calculateTax({
          subtotalCents: order.subtotalCents,
          shippingAddress: order.shippingAddress,
          items: order.items || [],
        });

        results[order.storeId] = tax;
      } catch (error) {
        logger.error(`Tax calculation failed for store ${order.storeId}:`, error);
        results[order.storeId] = {
          error: error.message,
          taxCents: 0,
        };
      }
    }

    return results;
  }

  /**
   * Validate tax calculation result
   * @param {Object} taxResult - Tax calculation result
   * @returns {boolean} True if valid
   */
  static validateTaxResult(taxResult) {
    return (
      taxResult &&
      typeof taxResult.taxCents === 'number' &&
      taxResult.taxCents >= 0 &&
      typeof taxResult.taxRate === 'number' &&
      taxResult.taxRate >= 0
    );
  }

  /**
   * Format tax amount for display
   * @param {number} taxCents - Tax amount in cents
   * @returns {string} Formatted tax amount
   */
  static formatTaxAmount(taxCents) {
    return `$${(taxCents / 100).toFixed(2)}`;
  }

  /**
   * Get tax rate for a state (without calculation)
   * @param {string} stateCode - US state code (e.g., 'CA', 'NY')
   * @returns {Object} Tax rate info
   */
  static getTaxRateForState(stateCode) {
    const state = String(stateCode).toUpperCase();
    const rate = US_STATE_TAX_RATES[state];

    if (rate === undefined) {
      return {
        state,
        rate: null,
        found: false,
        message: 'State not found or tax rate not available',
      };
    }

    return {
      state,
      rate,
      ratePercent: rate * 100,
      found: true,
      hasSalesTax: rate > 0,
    };
  }

  /**
   * Check if enhanced tax calculation is available
   * Returns true if TaxJar/Avalara is configured
   * @returns {boolean}
   */
  static isEnhancedTaxAvailable() {
    // TODO: Check if TaxJar or Avalara API keys are configured
    return false;
  }
}

module.exports = TaxCalculationService;
