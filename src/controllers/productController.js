/**
 * Product Controller
 * Handles product-related HTTP requests
 */

const productRealtimeService = require('../services/productRealtimeService');
const productCatalogBatchService = require('../services/productCatalogBatchService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class ProductController {
  /**
   * Get real-time product details
   * Triggered when user clicks into product page
   */
  async getProductDetails(req, res) {
    try {
      const { productId } = req.params;
      const parsedProductId = Number.parseInt(productId, 10);
      const userId = req.userId;

      if (!Number.isInteger(parsedProductId)) {
        return res.status(400).json(errorResponse('BAD_REQUEST', 'Invalid productId'));
      }

      const productData = await productRealtimeService.getRealtimeProductData(
        parsedProductId,
        userId
      );

      return res.status(200).json(successResponse(productData, 'Product details retrieved successfully'));
    } catch (error) {
      console.error('[ProductController] Error getting product details:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Generate affiliate checkout link
   */
  async getCheckoutLink(req, res) {
    try {
      const { productId } = req.params;
      const parsedProductId = Number.parseInt(productId, 10);
      const userId = req.userId;

      if (!Number.isInteger(parsedProductId)) {
        return res.status(400).json(errorResponse('BAD_REQUEST', 'Invalid productId'));
      }

      const affiliateLink = await productRealtimeService.generateAffiliateLink(
        parsedProductId,
        userId
      );

      return res.status(200).json(successResponse({ checkout_url: affiliateLink }, 'Checkout link generated successfully'));
    } catch (error) {
      console.error('[ProductController] Error generating checkout link:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Track user adding product to cart
   */
  async addToCart(req, res) {
    try {
      const { productId } = req.params;
      const parsedProductId = Number.parseInt(productId, 10);
      const userId = req.userId;

      if (!Number.isInteger(parsedProductId)) {
        return res.status(400).json(errorResponse('BAD_REQUEST', 'Invalid productId'));
      }

      const productData = await productRealtimeService.trackCartAdd(
        userId,
        parsedProductId
      );

      return res.status(200).json(successResponse(productData, 'Product added to cart successfully'));
    } catch (error) {
      console.error('[ProductController] Error adding to cart:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Batch get real-time data for cart items
   */
  async getCartItemsData(req, res) {
    try {
      const { productIds } = req.body;
      const userId = req.userId;

      if (!Array.isArray(productIds)) {
        return res.status(400).json(errorResponse('BAD_REQUEST', 'productIds must be an array'));
      }

      const results = await productRealtimeService.batchGetRealtimeData(
        productIds,
        userId
      );

      return res.status(200).json(successResponse(results, 'Cart items data retrieved successfully'));
    } catch (error) {
      console.error('[ProductController] Error getting cart items:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Get API cost statistics (admin only)
   */
  async getCostStats(req, res) {
    try {
      const { days = 7 } = req.query;
      const stats = await productRealtimeService.getCostStats(Number.parseInt(days, 10));
      return res.status(200).json(successResponse(stats, 'Cost statistics retrieved successfully'));
    } catch (error) {
      console.error('[ProductController] Error getting cost stats:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Get cache performance statistics (admin only)
   */
  async getCacheStats(req, res) {
    try {
      const { hours = 24 } = req.query;
      const stats = await productRealtimeService.getCacheStats(Number.parseInt(hours, 10));
      return res.status(200).json(successResponse(stats, 'Cache statistics retrieved successfully'));
    } catch (error) {
      console.error('[ProductController] Error getting cache stats:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Get batch import statistics (admin only)
   */
  async getBatchImportStats(req, res) {
    try {
      const { days = 7 } = req.query;
      const stats = await productCatalogBatchService.getImportStats(Number.parseInt(days, 10));
      return res.status(200).json(successResponse(stats, 'Batch import statistics retrieved successfully'));
    } catch (error) {
      console.error('[ProductController] Error getting batch stats:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }

  /**
   * Manually trigger batch import for a store (admin only)
   */
  async triggerBatchImport(req, res) {
    try {
      const { storeId, affiliateNetwork, jobType = 'full_catalog' } = req.body;

      if (!storeId || !affiliateNetwork) {
        return res.status(400).json(errorResponse('BAD_REQUEST', 'storeId and affiliateNetwork are required'));
      }

      let result;
      if (jobType === 'price_update') {
        result = await productCatalogBatchService.updateStorePrices(
          storeId,
          affiliateNetwork
        );
      } else {
        result = await productCatalogBatchService.importStoreCatalog(
          storeId,
          affiliateNetwork
        );
      }

      return res.status(200).json(successResponse(result, `Batch ${jobType} completed successfully`));
    } catch (error) {
      console.error('[ProductController] Error triggering batch import:', error);
      return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
    }
  }
}

module.exports = new ProductController();
