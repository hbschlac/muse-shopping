/**
 * Product Controller
 * Handles product-related HTTP requests
 */

const productRealtimeService = require('../services/productRealtimeService');
const productCatalogBatchService = require('../services/productCatalogBatchService');
const responseFormatter = require('../utils/responseFormatter');

class ProductController {
  /**
   * Get real-time product details
   * Triggered when user clicks into product page
   */
  async getProductDetails(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;

      const productData = await productRealtimeService.getRealtimeProductData(
        parseInt(productId),
        userId
      );

      return responseFormatter.success(
        res,
        productData,
        'Product details retrieved successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error getting product details:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Generate affiliate checkout link
   */
  async getCheckoutLink(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;

      const affiliateLink = await productRealtimeService.generateAffiliateLink(
        parseInt(productId),
        userId
      );

      return responseFormatter.success(
        res,
        { checkout_url: affiliateLink },
        'Checkout link generated successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error generating checkout link:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Track user adding product to cart
   */
  async addToCart(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;

      const productData = await productRealtimeService.trackCartAdd(
        userId,
        parseInt(productId)
      );

      return responseFormatter.success(
        res,
        productData,
        'Product added to cart successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error adding to cart:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Batch get real-time data for cart items
   */
  async getCartItemsData(req, res) {
    try {
      const { productIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(productIds)) {
        return responseFormatter.error(res, 'productIds must be an array', 400);
      }

      const results = await productRealtimeService.batchGetRealtimeData(
        productIds,
        userId
      );

      return responseFormatter.success(
        res,
        results,
        'Cart items data retrieved successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error getting cart items:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Get API cost statistics (admin only)
   */
  async getCostStats(req, res) {
    try {
      const { days = 7 } = req.query;

      const stats = await productRealtimeService.getCostStats(parseInt(days));

      return responseFormatter.success(
        res,
        stats,
        'Cost statistics retrieved successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error getting cost stats:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Get cache performance statistics (admin only)
   */
  async getCacheStats(req, res) {
    try {
      const { hours = 24 } = req.query;

      const stats = await productRealtimeService.getCacheStats(parseInt(hours));

      return responseFormatter.success(
        res,
        stats,
        'Cache statistics retrieved successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error getting cache stats:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Get batch import statistics (admin only)
   */
  async getBatchImportStats(req, res) {
    try {
      const { days = 7 } = req.query;

      const stats = await productCatalogBatchService.getImportStats(parseInt(days));

      return responseFormatter.success(
        res,
        stats,
        'Batch import statistics retrieved successfully'
      );
    } catch (error) {
      console.error('[ProductController] Error getting batch stats:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }

  /**
   * Manually trigger batch import for a store (admin only)
   */
  async triggerBatchImport(req, res) {
    try {
      const { storeId, affiliateNetwork, jobType = 'full_catalog' } = req.body;

      if (!storeId || !affiliateNetwork) {
        return responseFormatter.error(
          res,
          'storeId and affiliateNetwork are required',
          400
        );
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

      return responseFormatter.success(
        res,
        result,
        `Batch ${jobType} completed successfully`
      );
    } catch (error) {
      console.error('[ProductController] Error triggering batch import:', error);
      return responseFormatter.error(res, error.message, 500);
    }
  }
}

module.exports = new ProductController();
