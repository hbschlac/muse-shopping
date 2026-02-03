/**
 * Cart Service
 * Manages multi-store shopping cart for unified checkout
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

class CartService {
  /**
   * Add item to cart
   * @param {number} userId - User ID
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Added cart item
   */
  static async addItem(userId, itemData) {
    const {
      storeId,
      brandId,
      productName,
      productSku,
      productUrl,
      productImageUrl,
      productDescription,
      priceCents,
      originalPriceCents,
      size,
      color,
      quantity = 1,
      inStock = true,
      metadata = {},
    } = itemData;

    // Validation
    if (!productName || !productUrl || !priceCents || priceCents < 0) {
      throw new ValidationError('Missing required product information');
    }

    if (!storeId) {
      throw new ValidationError('Store ID is required');
    }

    if (quantity < 1 || quantity > 99) {
      throw new ValidationError('Quantity must be between 1 and 99');
    }

    try {
      // Check if item already exists (same product, size, color)
      const existingItem = await pool.query(
        `SELECT id, quantity FROM cart_items
         WHERE user_id = $1 AND store_id = $2 AND product_sku = $3
           AND COALESCE(size, '') = COALESCE($4, '')
           AND COALESCE(color, '') = COALESCE($5, '')`,
        [userId, storeId, productSku, size, color]
      );

      if (existingItem.rows.length > 0) {
        // Update quantity instead of adding duplicate
        const newQuantity = existingItem.rows[0].quantity + quantity;
        return await this.updateItemQuantity(userId, existingItem.rows[0].id, newQuantity);
      }

      // Add new item to cart
      const result = await pool.query(
        `INSERT INTO cart_items (
          user_id, store_id, brand_id, product_name, product_sku, product_url,
          product_image_url, product_description, price_cents, original_price_cents,
          size, color, quantity, in_stock, metadata, last_stock_check
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING *`,
        [
          userId,
          storeId,
          brandId,
          productName,
          productSku,
          productUrl,
          productImageUrl,
          productDescription,
          priceCents,
          originalPriceCents,
          size,
          color,
          quantity,
          inStock,
          JSON.stringify(metadata),
        ]
      );

      logger.info(`Item added to cart for user ${userId}: ${productName}`);

      return this.formatCartItem(result.rows[0]);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Add multiple items to cart at once
   * @param {number} userId - User ID
   * @param {Array} items - Array of item data objects
   * @returns {Promise<Array>} Added cart items
   */
  static async addItems(userId, items) {
    const addedItems = [];
    const errors = [];

    for (const item of items) {
      try {
        const addedItem = await this.addItem(userId, item);
        addedItems.push(addedItem);
      } catch (error) {
        errors.push({
          item: item.productName,
          error: error.message,
        });
      }
    }

    return {
      success: addedItems,
      failed: errors,
      summary: {
        added: addedItems.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Get user's cart grouped by store
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Cart grouped by stores
   */
  static async getCart(userId) {
    const result = await pool.query(
      `SELECT
        ci.*,
        s.name as store_name,
        s.display_name as store_display_name,
        s.slug as store_slug,
        s.logo_url as store_logo_url,
        s.integration_type,
        s.supports_checkout,
        b.name as brand_name,
        b.name as brand_name_alt
       FROM cart_items ci
       JOIN stores s ON ci.store_id = s.id
       LEFT JOIN brands b ON ci.brand_id = b.id
       WHERE ci.user_id = $1
       ORDER BY s.display_name, ci.added_at DESC`,
      [userId]
    );

    // Group items by store
    const storesMap = new Map();

    for (const item of result.rows) {
      const storeId = item.store_id;

      if (!storesMap.has(storeId)) {
        storesMap.set(storeId, {
          storeId,
          storeName: item.store_display_name || item.store_name,
          storeSlug: item.store_slug,
          storeLogo: item.store_logo_url,
          integrationType: item.integration_type,
          supportsCheckout: item.supports_checkout,
          items: [],
          subtotalCents: 0,
          itemCount: 0,
        });
      }

      const store = storesMap.get(storeId);
      const formattedItem = this.formatCartItem(item);
      store.items.push(formattedItem);
      store.subtotalCents += formattedItem.totalPriceCents;
      store.itemCount += formattedItem.quantity;
    }

    return {
      stores: Array.from(storesMap.values()),
      summary: this.calculateCartSummary(Array.from(storesMap.values())),
    };
  }

  /**
   * Update cart item quantity
   * @param {number} userId - User ID
   * @param {number} itemId - Cart item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart item
   */
  static async updateItemQuantity(userId, itemId, quantity) {
    if (quantity < 1 || quantity > 99) {
      throw new ValidationError('Quantity must be between 1 and 99');
    }

    const result = await pool.query(
      `UPDATE cart_items
       SET quantity = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [quantity, itemId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Cart item not found');
    }

    logger.info(`Cart item ${itemId} quantity updated to ${quantity} for user ${userId}`);

    return this.formatCartItem(result.rows[0]);
  }

  /**
   * Update cart item (size, color, etc.)
   * @param {number} userId - User ID
   * @param {number} itemId - Cart item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated cart item
   */
  static async updateItem(userId, itemId, updates) {
    const allowedFields = ['quantity', 'size', 'color'];
    const validUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Build dynamic SET clause
    const setClause = Object.keys(validUpdates)
      .map((key, idx) => `${key} = $${idx + 2}`)
      .join(', ');

    const values = [itemId, userId, ...Object.values(validUpdates)];

    const result = await pool.query(
      `UPDATE cart_items
       SET ${setClause}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Cart item not found');
    }

    logger.info(`Cart item ${itemId} updated for user ${userId}`);

    return this.formatCartItem(result.rows[0]);
  }

  /**
   * Remove item from cart
   * @param {number} userId - User ID
   * @param {number} itemId - Cart item ID
   * @returns {Promise<void>}
   */
  static async removeItem(userId, itemId) {
    const result = await pool.query(
      `DELETE FROM cart_items
       WHERE id = $1 AND user_id = $2
       RETURNING product_name`,
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Cart item not found');
    }

    logger.info(`Cart item ${itemId} removed for user ${userId}: ${result.rows[0].product_name}`);
  }

  /**
   * Clear entire cart for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Deletion summary
   */
  static async clearCart(userId) {
    const result = await pool.query(
      `DELETE FROM cart_items
       WHERE user_id = $1
       RETURNING id`,
      [userId]
    );

    const deletedCount = result.rows.length;

    logger.info(`Cart cleared for user ${userId}: ${deletedCount} items removed`);

    return {
      itemsRemoved: deletedCount,
    };
  }

  /**
   * Get cart summary (totals, counts)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Cart summary
   */
  static async getCartSummary(userId) {
    const cart = await this.getCart(userId);
    return cart.summary;
  }

  /**
   * Check if product is already in cart
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @param {string} productSku - Product SKU
   * @param {string} size - Size
   * @param {string} color - Color
   * @returns {Promise<Object|null>} Cart item or null
   */
  static async findExistingItem(userId, storeId, productSku, size, color) {
    const result = await pool.query(
      `SELECT * FROM cart_items
       WHERE user_id = $1 AND store_id = $2 AND product_sku = $3
         AND COALESCE(size, '') = COALESCE($4, '')
         AND COALESCE(color, '') = COALESCE($5, '')`,
      [userId, storeId, productSku, size, color]
    );

    return result.rows.length > 0 ? this.formatCartItem(result.rows[0]) : null;
  }

  /**
   * Format cart item for response
   * @param {Object} item - Raw cart item from database
   * @returns {Object} Formatted cart item
   */
  static formatCartItem(item) {
    const priceCents = item.price_cents;
    const quantity = item.quantity;
    const totalPriceCents = priceCents * quantity;

    return {
      id: item.id,
      storeId: item.store_id,
      brandId: item.brand_id,
      productName: item.product_name,
      productSku: item.product_sku,
      productUrl: item.product_url,
      productImageUrl: item.product_image_url,
      productDescription: item.product_description,
      priceCents,
      priceDisplay: this.formatPrice(priceCents),
      originalPriceCents: item.original_price_cents,
      originalPriceDisplay: item.original_price_cents
        ? this.formatPrice(item.original_price_cents)
        : null,
      discount: item.original_price_cents
        ? item.original_price_cents - priceCents
        : 0,
      discountPercent: item.original_price_cents
        ? Math.round(((item.original_price_cents - priceCents) / item.original_price_cents) * 100)
        : 0,
      size: item.size,
      color: item.color,
      quantity,
      totalPriceCents,
      totalPriceDisplay: this.formatPrice(totalPriceCents),
      inStock: item.in_stock,
      lastStockCheck: item.last_stock_check,
      metadata: item.metadata,
      addedAt: item.added_at,
      updatedAt: item.updated_at,
      // Include store/brand info if present
      storeName: item.store_display_name || item.store_name,
      brandName: item.brand_name || item.brand_name,
    };
  }

  /**
   * Calculate cart summary from stores
   * @param {Array} stores - Array of store cart objects
   * @returns {Object} Cart summary
   */
  static calculateCartSummary(stores) {
    let totalItemCount = 0;
    let totalStoreCount = stores.length;
    let totalCents = 0;
    let totalDiscount = 0;

    for (const store of stores) {
      totalItemCount += store.itemCount;
      totalCents += store.subtotalCents;

      // Calculate total discount
      for (const item of store.items) {
        if (item.originalPriceCents) {
          totalDiscount += (item.originalPriceCents - item.priceCents) * item.quantity;
        }
      }
    }

    return {
      totalStoreCount,
      totalItemCount,
      totalCents,
      totalDisplay: this.formatPrice(totalCents),
      totalDiscount,
      totalDiscountDisplay: this.formatPrice(totalDiscount),
      subtotalCents: totalCents,
      subtotalDisplay: this.formatPrice(totalCents),
      // Shipping will be calculated at checkout based on stores
      estimatedShippingCents: 0,
      estimatedTaxCents: 0,
      // Grand total (will include shipping/tax at checkout)
      grandTotalCents: totalCents,
      grandTotalDisplay: this.formatPrice(totalCents),
    };
  }

  /**
   * Format price in cents to display format
   * @param {number} cents - Price in cents
   * @returns {string} Formatted price (e.g., "$12.99")
   */
  static formatPrice(cents) {
    if (cents === null || cents === undefined) return null;
    return `$${(cents / 100).toFixed(2)}`;
  }
}

module.exports = CartService;
