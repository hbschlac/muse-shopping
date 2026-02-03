/**
 * Nordstrom API Client
 * Integrates with Nordstrom Partner API for OAuth-based checkout
 *
 * NOTE: This is a template based on typical retailer API patterns.
 * Actual Nordstrom API endpoints and structure would need to be confirmed
 * with Nordstrom partnership team.
 */

const logger = require('../../utils/logger');

class NordstromAPI {
  constructor(options = {}) {
    this.accessToken = options.accessToken;
    this.baseUrl = process.env.NORDSTROM_API_BASE_URL || 'https://api.nordstrom.com/v1';
  }

  /**
   * Create order using customer's Nordstrom account
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} Order result
   */
  async createOrder(orderData) {
    const { items, shippingAddress, paymentMethodId } = orderData;

    logger.info('Creating Nordstrom order via API');

    const response = await this.makeRequest('POST', '/checkout/orders', {
      items: items.map(item => ({
        styleId: item.sku,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      shipping: {
        method: 'STANDARD', // 'EXPRESS', 'NEXT_DAY' - may be free for Nordy Club members
        address: {
          recipientName: shippingAddress.name,
          street1: shippingAddress.address1,
          street2: shippingAddress.address2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zip,
          country: shippingAddress.country || 'US',
          phoneNumber: shippingAddress.phone,
        },
      },
      payment: {
        methodId: paymentMethodId, // Reference to customer's saved card
      },
    });

    return {
      orderId: response.orderId,
      orderNumber: response.orderNumber,
      total: response.pricing.total * 100, // Convert to cents
      tax: response.pricing.tax * 100,
      shipping: response.pricing.shipping * 100,
      estimatedDelivery: response.fulfillment.estimatedDeliveryDate,
      trackingNumber: response.fulfillment.trackingNumber,
      nordyClubPoints: response.rewards?.pointsEarned, // Nordy Club rewards
    };
  }

  /**
   * Get customer's saved payment methods
   * @returns {Promise<Array>} Payment methods
   */
  async getPaymentMethods() {
    logger.info('Fetching Nordstrom payment methods');

    const response = await this.makeRequest('GET', '/account/payment-methods');

    return response.paymentMethods.map(pm => ({
      id: pm.id,
      type: pm.type, // 'CREDIT_CARD', 'NORDSTROM_CARD', 'DEBIT_CARD'
      brand: pm.cardBrand,
      last4: pm.lastFourDigits,
      expMonth: pm.expirationMonth,
      expYear: pm.expirationYear,
      isDefault: pm.isPreferred,
      nickname: pm.nickname,
      isNordstromCard: pm.type === 'NORDSTROM_CARD', // Special benefits
    }));
  }

  /**
   * Get customer's saved addresses
   * @returns {Promise<Array>} Shipping addresses
   */
  async getShippingAddresses() {
    logger.info('Fetching Nordstrom shipping addresses');

    const response = await this.makeRequest('GET', '/account/addresses');

    return response.addresses.map(addr => ({
      id: addr.id,
      name: addr.recipientName,
      address1: addr.street1,
      address2: addr.street2,
      city: addr.city,
      state: addr.state,
      zip: addr.zipCode,
      country: addr.country,
      phone: addr.phoneNumber,
      isDefault: addr.isPreferred,
    }));
  }

  /**
   * Get order status and tracking
   * @param {string} orderId - Nordstrom order ID
   * @returns {Promise<Object>} Order status
   */
  async getOrderStatus(orderId) {
    logger.info(`Fetching Nordstrom order status: ${orderId}`);

    const response = await this.makeRequest('GET', `/orders/${orderId}`);

    return {
      orderId: response.orderId,
      orderNumber: response.orderNumber,
      status: response.status, // 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'
      trackingNumber: response.fulfillment?.trackingNumber,
      carrier: response.fulfillment?.carrier,
      estimatedDelivery: response.fulfillment?.estimatedDeliveryDate,
      actualDelivery: response.fulfillment?.actualDeliveryDate,
      items: response.items,
    };
  }

  /**
   * Get return eligibility
   * @param {string} orderId - Nordstrom order ID
   * @returns {Promise<Object>} Return eligibility info
   */
  async getReturnEligibility(orderId) {
    logger.info(`Checking Nordstrom return eligibility for order: ${orderId}`);

    const response = await this.makeRequest('GET', `/orders/${orderId}/return-eligibility`);

    return {
      eligible: response.eligible,
      reason: response.ineligibilityReason,
      daysRemaining: response.returnWindowDaysRemaining,
      returnWindow: response.returnPolicyDays ? `${response.returnPolicyDays} days` : 'Variable',
      returnMethods: response.returnOptions, // ['SHIP', 'IN_STORE', 'CURBSIDE']
      items: response.eligibleItems.map(item => ({
        itemId: item.id,
        styleId: item.styleId,
        quantity: item.quantity,
        returnEligible: item.eligible,
      })),
    };
  }

  /**
   * Initiate return for order
   * @param {string} orderId - Nordstrom order ID
   * @param {Array} items - Items to return
   * @param {string} returnMethod - Return method
   * @returns {Promise<Object>} Return result
   */
  async initiateReturn(orderId, items, returnMethod = 'ship') {
    logger.info(`Initiating Nordstrom return for order: ${orderId}`);

    const response = await this.makeRequest('POST', `/orders/${orderId}/returns`, {
      returnMethod: returnMethod.toUpperCase(), // 'SHIP', 'IN_STORE', 'CURBSIDE'
      items: items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        returnReason: item.reason,
      })),
    });

    return {
      returnId: response.returnId,
      returnNumber: response.returnNumber,
      returnLabel: {
        pdfUrl: response.returnLabel?.labelUrl,
        qrCode: response.returnLabel?.qrCode, // For in-store/curbside returns
      },
      trackingNumber: response.returnLabel?.trackingNumber,
      carrier: response.returnLabel?.carrier,
      refundAmount: response.refund.amount * 100, // Convert to cents
      refundMethod: response.refund.method, // 'ORIGINAL_PAYMENT', 'GIFT_CARD', 'NORDSTROM_NOTE'
      estimatedRefundDate: response.refund.estimatedDate,
      nordyClubPointsRefunded: response.rewards?.pointsRefunded,
    };
  }

  /**
   * Get return status
   * @param {string} returnId - Nordstrom return ID
   * @returns {Promise<Object>} Return status
   */
  async getReturnStatus(returnId) {
    logger.info(`Fetching Nordstrom return status: ${returnId}`);

    const response = await this.makeRequest('GET', `/returns/${returnId}`);

    return {
      returnStatus: response.status, // 'INITIATED', 'LABEL_CREATED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REFUNDED'
      refundStatus: response.refund.status, // 'PENDING', 'PROCESSING', 'COMPLETED'
      refundDate: response.refund.processedDate,
      trackingInfo: response.tracking,
    };
  }

  /**
   * Get customer profile
   * @returns {Promise<Object>} Customer info
   */
  async getCustomerProfile() {
    logger.info('Fetching Nordstrom customer profile');

    const response = await this.makeRequest('GET', '/account/profile');

    return {
      customerId: response.customerId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      phone: response.phoneNumber,
      nordyClubLevel: response.nordyClub?.memberLevel, // 'MEMBER', 'INFLUENCER', 'AMBASSADOR', 'ICON'
      nordyClubPoints: response.nordyClub?.currentPoints,
      hasNordstromCard: response.nordstromCard?.isActive,
    };
  }

  /**
   * Make authenticated API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Nordstrom-Partner-Id': process.env.NORDSTROM_PARTNER_ID || 'muse',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        logger.error('Nordstrom API error:', error);
        throw new Error(error.message || 'Nordstrom API request failed');
      }

      return await response.json();
    } catch (error) {
      logger.error('Nordstrom API request failed:', error);
      throw error;
    }
  }
}

module.exports = NordstromAPI;
