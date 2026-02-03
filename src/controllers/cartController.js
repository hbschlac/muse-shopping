/**
 * Cart Controller
 * Handles HTTP requests for shopping cart operations
 */

const CartService = require('../services/cartService');
const StyleProfileService = require('../services/styleProfileService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class CartController {
  /**
   * Add item to cart
   * POST /api/v1/cart/items
   */
  static async addItem(req, res, next) {
    try {
      const userId = req.userId;
      const itemData = req.body;

      const cartItem = await CartService.addItem(userId, itemData);

      // Track style profile event
      try {
        if (cartItem.item_id) {
          await StyleProfileService.updateProfile(
            userId,
            'add_to_cart',
            'product',
            cartItem.item_id
          );
        }
      } catch (profileError) {
        logger.error('Error updating style profile:', profileError);
        // Don't fail the request if profile update fails
      }

      return res.status(201).json(successResponse(cartItem, 'Item added to cart'));
    } catch (error) {
      logger.error('Error in addItem controller:', error);
      next(error);
    }
  }

  /**
   * Add multiple items to cart
   * POST /api/v1/cart/items/batch
   */
  static async addItems(req, res, next) {
    try {
      const userId = req.userId;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", 'Items array is required'));
      }

      const result = await CartService.addItems(userId, items);

      // Track style profile events for successfully added items
      try {
        if (result.items && result.items.length > 0) {
          for (const cartItem of result.items) {
            if (cartItem.item_id) {
              await StyleProfileService.updateProfile(
                userId,
                'add_to_cart',
                'product',
                cartItem.item_id
              );
            }
          }
        }
      } catch (profileError) {
        logger.error('Error updating style profile for batch add:', profileError);
        // Don't fail the request if profile update fails
      }

      return res.status(201).json(successResponse(result, `Added ${result.summary.added} items to cart`));
    } catch (error) {
      logger.error('Error in addItems controller:', error);
      next(error);
    }
  }

  /**
   * Get user's cart
   * GET /api/v1/cart
   */
  static async getCart(req, res, next) {
    try {
      const userId = req.userId;

      const cart = await CartService.getCart(userId);

      return res.status(200).json(successResponse(cart, 'Cart retrieved successfully'));
    } catch (error) {
      logger.error('Error in getCart controller:', error);
      next(error);
    }
  }

  /**
   * Get cart summary
   * GET /api/v1/cart/summary
   */
  static async getCartSummary(req, res, next) {
    try {
      const userId = req.userId;

      const summary = await CartService.getCartSummary(userId);

      return res.status(200).json(successResponse(summary, 'Cart summary retrieved'));
    } catch (error) {
      logger.error('Error in getCartSummary controller:', error);
      next(error);
    }
  }

  /**
   * Update cart item
   * PUT /api/v1/cart/items/:id
   */
  static async updateItem(req, res, next) {
    try {
      const userId = req.userId;
      const itemId = parseInt(req.params.id);
      const updates = req.body;

      if (isNaN(itemId)) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", 'Invalid item ID'));
      }

      const updatedItem = await CartService.updateItem(userId, itemId, updates);

      return res.status(200).json(successResponse(updatedItem, 'Cart item updated'));
    } catch (error) {
      logger.error('Error in updateItem controller:', error);
      next(error);
    }
  }

  /**
   * Update cart item quantity
   * PATCH /api/v1/cart/items/:id/quantity
   */
  static async updateItemQuantity(req, res, next) {
    try {
      const userId = req.userId;
      const itemId = parseInt(req.params.id);
      const { quantity } = req.body;

      if (isNaN(itemId) || !quantity || quantity < 1) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", 'Invalid item ID or quantity'));
      }

      const updatedItem = await CartService.updateItemQuantity(userId, itemId, quantity);

      return res.status(200).json(successResponse(updatedItem, 'Quantity updated'));
    } catch (error) {
      logger.error('Error in updateItemQuantity controller:', error);
      next(error);
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/v1/cart/items/:id
   */
  static async removeItem(req, res, next) {
    try {
      const userId = req.userId;
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", 'Invalid item ID'));
      }

      await CartService.removeItem(userId, itemId);

      return res.status(200).json(successResponse(null, 'Item removed from cart'));
    } catch (error) {
      logger.error('Error in removeItem controller:', error);
      next(error);
    }
  }

  /**
   * Clear cart
   * DELETE /api/v1/cart
   */
  static async clearCart(req, res, next) {
    try {
      const userId = req.userId;

      const result = await CartService.clearCart(userId);

      return res.status(200).json(successResponse(result, `Cart cleared: ${result.itemsRemoved} items removed`));
    } catch (error) {
      logger.error('Error in clearCart controller:', error);
      next(error);
    }
  }

  /**
   * Check if item exists in cart
   * GET /api/v1/cart/items/check
   */
  static async checkItem(req, res, next) {
    try {
      const userId = req.userId;
      const { storeId, productSku, size, color } = req.query;

      if (!storeId || !productSku) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", 'storeId and productSku are required'));
      }

      const existingItem = await CartService.findExistingItem(
        userId,
        parseInt(storeId),
        productSku,
        size,
        color
      );

      return res.status(200).json(successResponse(
        {
          exists: !!existingItem,
          item: existingItem,
        },
        existingItem ? 'Item found in cart' : 'Item not in cart'
      ));
    } catch (error) {
      logger.error('Error in checkItem controller:', error);
      next(error);
    }
  }
}

module.exports = CartController;
