const ItemService = require('../services/itemService');
const StyleProfileService = require('../services/styleProfileService');
const logger = require('../utils/logger');

class ItemController {
  /**
   * GET /api/v1/items
   * Browse/discover items with filters
   */
  static async discoverItems(req, res, next) {
    try {
      const {
        brands,
        categories,
        subcategories,
        attributes,
        min_price,
        max_price,
        on_sale,
        in_stock = 'true',
        search,
        sort_by = 'newest',
        limit = '50',
        offset = '0'
      } = req.query;

      // Parse filters
      const filters = {
        brands: brands ? brands.split(',').map(Number) : null,
        categories: categories ? categories.split(',') : null,
        subcategories: subcategories ? subcategories.split(',') : null,
        attributes: attributes ? attributes.split(',') : null,
        minPrice: min_price ? parseFloat(min_price) : null,
        maxPrice: max_price ? parseFloat(max_price) : null,
        onSale: on_sale === 'true' ? true : null,
        inStock: in_stock === 'true',
        search: search || null,
        sortBy: sort_by
      };

      const pagination = {
        limit: Math.min(parseInt(limit), 100), // Max 100 items per request
        offset: parseInt(offset)
      };

      const result = await ItemService.discoverItems(filters, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/discover/personalized
   * Get personalized discover feed (items from followed brands)
   */
  static async getPersonalizedDiscover(req, res, next) {
    try {
      const userId = req.userId;
      const {
        categories,
        subcategories,
        attributes,
        min_price,
        max_price,
        on_sale,
        in_stock = 'true',
        search,
        sort_by = 'newest',
        limit = '50',
        offset = '0'
      } = req.query;

      const filters = {
        categories: categories ? categories.split(',') : null,
        subcategories: subcategories ? subcategories.split(',') : null,
        attributes: attributes ? attributes.split(',') : null,
        minPrice: min_price ? parseFloat(min_price) : null,
        maxPrice: max_price ? parseFloat(max_price) : null,
        onSale: on_sale === 'true' ? true : null,
        inStock: in_stock === 'true',
        search: search || null,
        sortBy: sort_by
      };

      const pagination = {
        limit: Math.min(parseInt(limit), 100),
        offset: parseInt(offset)
      };

      const result = await ItemService.getPersonalizedDiscover(userId, filters, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/search
   * Search items by keyword
   */
  static async searchItems(req, res, next) {
    try {
      const { q, limit = '50', offset = '0', sort_by = 'newest' } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query (q) is required'
          }
        });
      }

      const filters = {
        sortBy: sort_by
      };

      const pagination = {
        limit: Math.min(parseInt(limit), 100),
        offset: parseInt(offset)
      };

      const result = await ItemService.searchItems(q, filters, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/filters
   * Get available filter options
   */
  static async getFilterOptions(req, res, next) {
    try {
      const options = await ItemService.getFilterOptions();

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/:itemId
   * Get item details
   */
  static async getItemDetails(req, res, next) {
    try {
      const { itemId } = req.params;
      const userId = req.userId; // May be null if not authenticated

      const item = await ItemService.getItemDetails(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Item not found'
          }
        });
      }

      // Check if favorited (if user is authenticated)
      if (userId) {
        item.is_favorited = await ItemService.isFavorited(userId, itemId);
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/:itemId/reviews
   * Get item reviews summary + recent reviews
   */
  static async getItemReviews(req, res, next) {
    try {
      const { itemId } = req.params;
      const { limit = '3', offset = '0', sort_by = 'newest' } = req.query;

      const reviews = await ItemService.getItemReviews(
        itemId,
        parseInt(limit),
        parseInt(offset),
        sort_by
      );

      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/items/:itemId/reviews
   * Create a review (auth optional, name required if unauthenticated)
   */
  static async createItemReview(req, res, next) {
    try {
      const { itemId } = req.params;
      const userId = req.userId || null;
      const { rating, title, body, reviewer_name } = req.body;

      const parsedRating = parseInt(rating, 10);
      if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'rating must be an integer between 1 and 5'
          }
        });
      }

      if (!body || String(body).trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'body must be at least 10 characters'
          }
        });
      }

      if (!userId && (!reviewer_name || String(reviewer_name).trim().length < 2)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'reviewer_name is required when not authenticated'
          }
        });
      }

      const review = await ItemService.createItemReview(
        itemId,
        {
          userId,
          rating: parsedRating,
          title,
          body,
          reviewerName: reviewer_name
        }
      );

      res.status(201).json({
        success: true,
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/items/:itemId/reviews/:reviewId/helpful
   * Increment helpful count
   */
  static async markReviewHelpful(req, res, next) {
    try {
      const { itemId, reviewId } = req.params;
      const userId = req.userId || null;
      const ipAddress = req.ip;

      const updated = await ItemService.incrementReviewHelpful(
        parseInt(itemId, 10),
        parseInt(reviewId, 10),
        { userId, ipAddress }
      );

      if (updated && updated.already_marked) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_MARKED',
            message: 'Helpful already recorded'
          }
        });
      }

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found'
          }
        });
      }

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/items/:itemId/reviews/:reviewId/report
   * Report a review
   */
  static async reportReview(req, res, next) {
    try {
      const { itemId, reviewId } = req.params;
      const userId = req.userId || null;
      const ipAddress = req.ip;
      const { reason = 'inappropriate' } = req.body || {};

      const report = await ItemService.reportReview(
        parseInt(itemId, 10),
        parseInt(reviewId, 10),
        { userId, ipAddress, reason }
      );

      if (!report) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found'
          }
        });
      }

      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/:itemId/pdp
   * Get PDP bundle (item details + similar items)
   */
  static async getPdpBundle(req, res, next) {
    try {
      const { itemId } = req.params;
      const userId = req.userId; // May be null if not authenticated
      const { similar_limit = '8' } = req.query;

      const bundle = await ItemService.getPdpBundle(
        itemId,
        userId,
        { similarLimit: parseInt(similar_limit) }
      );

      if (!bundle) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Item not found'
          }
        });
      }

      res.json({
        success: true,
        data: bundle
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/:itemId/similar
   * Get similar items
   */
  static async getSimilarItems(req, res, next) {
    try {
      const { itemId } = req.params;
      const { limit = '10' } = req.query;

      const items = await ItemService.getSimilarItems(itemId, parseInt(limit));

      res.json({
        success: true,
        data: { items }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/items/:itemId/view
   * Track item view
   */
  static async trackView(req, res, next) {
    try {
      const userId = req.userId;
      const { itemId } = req.params;
      const { context = {} } = req.body;

      const interaction = await ItemService.trackItemView(userId, itemId, context);

      res.json({
        success: true,
        data: interaction
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/items/:itemId/click
   * Track item click (click to retailer)
   */
  static async trackClick(req, res, next) {
    try {
      const userId = req.userId;
      const { itemId } = req.params;
      const { listing_id, context = {} } = req.body;

      const interaction = await ItemService.trackItemClick(
        userId,
        itemId,
        listing_id,
        context
      );

      // Track style profile event
      try {
        await StyleProfileService.updateProfile(
          userId,
          'click',
          'product',
          parseInt(itemId)
        );
      } catch (profileError) {
        logger.error('Error updating style profile:', profileError);
      }

      res.json({
        success: true,
        data: interaction
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/items/:itemId/favorite
   * Add item to favorites
   */
  static async addToFavorites(req, res, next) {
    try {
      const userId = req.userId;
      const { itemId } = req.params;
      const { notes } = req.body;

      const favorite = await ItemService.addToFavorites(userId, itemId, notes);

      // Track style profile event (save)
      try {
        await StyleProfileService.updateProfile(
          userId,
          'save',
          'product',
          parseInt(itemId)
        );
      } catch (profileError) {
        logger.error('Error updating style profile:', profileError);
      }

      res.json({
        success: true,
        data: favorite,
        message: 'Item added to favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/items/:itemId/favorite
   * Remove item from favorites
   */
  static async removeFromFavorites(req, res, next) {
    try {
      const userId = req.userId;
      const { itemId } = req.params;

      const removed = await ItemService.removeFromFavorites(userId, itemId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Item not in favorites'
          }
        });
      }

      res.json({
        success: true,
        message: 'Item removed from favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/items/favorites
   * Get user's favorited items
   */
  static async getFavorites(req, res, next) {
    try {
      const userId = req.userId;
      const { limit = '50', offset = '0' } = req.query;

      const result = await ItemService.getUserFavorites(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ItemController;
