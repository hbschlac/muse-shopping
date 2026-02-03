/**
 * Target API Client
 * Integrates with Target+ Partner API for OAuth-based checkout
 *
 * NOTE: This is a template based on typical retailer API patterns.
 * Actual Target API endpoints and structure would need to be confirmed
 * with Target partnership team.
 */

const logger = require('../../utils/logger');

class TargetAPI {
  constructor(options = {}) {
    this.accessToken = options.accessToken;
    this.baseUrl = process.env.TARGET_API_BASE_URL || 'https://api.target.com/partners/v1';
  }

  /**
   * Create order using customer's Target account
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} Order result
   */
  async createOrder(orderData) {
    const { items, shippingAddress, paymentMethodId } = orderData;

    logger.info('Creating Target order via API');

    const response = await this.makeRequest('POST', '/orders', {
      items: items.map(item => ({
        tcin: item.sku, // Target uses TCIN instead of SKU
        quantity: item.quantity,
        variant: {
          size: item.size,
          color: item.color,
        },
      })),
      shipping: {
        address: {
          firstName: shippingAddress.name.split(' ')[0],
          lastName: shippingAddress.name.split(' ').slice(1).join(' '),
          addressLine1: shippingAddress.address1,
          addressLine2: shippingAddress.address2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.zip,
          country: shippingAddress.country || 'US',
          phone: shippingAddress.phone,
        },
        method: 'STANDARD', // Could be upgraded based on user's RedCard status
      },
      payment: {
        methodId: paymentMethodId, // Reference to customer's saved card at Target
      },
    });

    return {
      orderId: response.orderId,
      orderNumber: response.orderNumber,
      total: response.total.amountInCents,
      tax: response.total.taxInCents,
      shipping: response.total.shippingInCents,
      estimatedDelivery: response.estimatedDeliveryDate,
      trackingNumber: response.trackingNumber,
    };
  }

  /**
   * Get customer's saved payment methods
   * @returns {Promise<Array>} Payment methods
   */
  async getPaymentMethods() {
    logger.info('Fetching Target payment methods');

    const response = await this.makeRequest('GET', '/customer/payment-methods');

    return response.paymentMethods.map(pm => ({
      id: pm.id,
      type: pm.type, // 'card', 'target_redcard', 'paypal'
      brand: pm.cardBrand,
      last4: pm.last4,
      expMonth: pm.expirationMonth,
      expYear: pm.expirationYear,
      isDefault: pm.isDefault,
      nickname: pm.nickname,
    }));
  }

  /**
   * Get customer's saved addresses
   * @returns {Promise<Array>} Shipping addresses
   */
  async getShippingAddresses() {
    logger.info('Fetching Target shipping addresses');

    const response = await this.makeRequest('GET', '/customer/addresses');

    return response.addresses.map(addr => ({
      id: addr.id,
      name: `${addr.firstName} ${addr.lastName}`,
      address1: addr.addressLine1,
      address2: addr.addressLine2,
      city: addr.city,
      state: addr.state,
      zip: addr.postalCode,
      country: addr.country,
      phone: addr.phone,
      isDefault: addr.isDefault,
    }));
  }

  /**
   * Get order status and tracking
   * @param {string} orderId - Target order ID
   * @returns {Promise<Object>} Order status
   */
  async getOrderStatus(orderId) {
    logger.info(`Fetching Target order status: ${orderId}`);

    const response = await this.makeRequest('GET', `/orders/${orderId}`);

    return {
      orderId: response.orderId,
      orderNumber: response.orderNumber,
      status: response.status, // 'pending', 'confirmed', 'shipped', 'delivered'
      trackingNumber: response.tracking?.trackingNumber,
      carrier: response.tracking?.carrier,
      estimatedDelivery: response.estimatedDeliveryDate,
      actualDelivery: response.actualDeliveryDate,
      items: response.items,
    };
  }

  /**
   * Initiate return for order
   * @param {string} orderId - Target order ID
   * @param {Array} items - Items to return
   * @returns {Promise<Object>} Return result
   */
  async initiateReturn(orderId, items) {
    logger.info(`Initiating Target return for order: ${orderId}`);

    const response = await this.makeRequest('POST', `/orders/${orderId}/returns`, {
      items: items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        reason: item.reason,
      })),
    });

    return {
      returnId: response.returnId,
      returnLabel: response.returnLabel?.url,
      refundAmount: response.refundAmount,
      refundMethod: response.refundMethod,
    };
  }

  /**
   * Get customer profile
   * @returns {Promise<Object>} Customer info
   */
  async getCustomerProfile() {
    logger.info('Fetching Target customer profile');

    const response = await this.makeRequest('GET', '/customer/profile');

    return {
      customerId: response.customerId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      phone: response.phone,
      isRedCardHolder: response.targetCircle?.isRedCardHolder,
      rewardsBalance: response.targetCircle?.rewardsBalance,
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
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        logger.error('Target API error:', error);
        throw new Error(error.message || 'Target API request failed');
      }

      return await response.json();
    } catch (error) {
      logger.error('Target API request failed:', error);
      throw error;
    }
  }
}

module.exports = TargetAPI;
