const CollectionService = require('../services/collectionService');
const { successResponse } = require('../utils/responseFormatter');

class CollectionController {
  /**
   * GET /api/v1/collections
   * Get all collections for the authenticated user
   */
  static async getUserCollections(req, res, next) {
    try {
      const userId = req.userId;
      const { limit = '50', offset = '0' } = req.query;

      const result = await CollectionService.getUserCollections(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.status(200).json(successResponse(result, 'Collections retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/collections
   * Create a new collection
   */
  static async createCollection(req, res, next) {
    try {
      const userId = req.userId;
      const collection = await CollectionService.createCollection(userId, req.body);

      res.status(201).json(successResponse({ collection }, 'Collection created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/collections/:id
   * Get collection by ID
   */
  static async getCollectionById(req, res, next) {
    try {
      const userId = req.userId;
      const collectionId = parseInt(req.params.id);

      const collection = await CollectionService.getCollectionById(collectionId, userId);

      res.status(200).json(successResponse({ collection }, 'Collection retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/collections/:id
   * Update collection
   */
  static async updateCollection(req, res, next) {
    try {
      const userId = req.userId;
      const collectionId = parseInt(req.params.id);

      const collection = await CollectionService.updateCollection(collectionId, userId, req.body);

      res.status(200).json(successResponse({ collection }, 'Collection updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/collections/:id
   * Delete collection
   */
  static async deleteCollection(req, res, next) {
    try {
      const userId = req.userId;
      const collectionId = parseInt(req.params.id);

      await CollectionService.deleteCollection(collectionId, userId);

      res.status(200).json(successResponse(null, 'Collection deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/collections/:id/items
   * Add item to collection
   */
  static async addItemToCollection(req, res, next) {
    try {
      const userId = req.userId;
      const collectionId = parseInt(req.params.id);
      const { item_id, notes } = req.body;

      const collectionItem = await CollectionService.addItemToCollection(
        collectionId,
        userId,
        item_id,
        notes
      );

      res.status(201).json(successResponse({ collectionItem }, 'Item added to collection'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/collections/:id/items/:itemId
   * Remove item from collection
   */
  static async removeItemFromCollection(req, res, next) {
    try {
      const userId = req.userId;
      const collectionId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);

      await CollectionService.removeItemFromCollection(collectionId, userId, itemId);

      res.status(200).json(successResponse(null, 'Item removed from collection'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/collections/:id/items
   * Get items in a collection
   */
  static async getCollectionItems(req, res, next) {
    try {
      const userId = req.userId;
      const collectionId = parseInt(req.params.id);
      const { limit = '50', offset = '0' } = req.query;

      const items = await CollectionService.getCollectionItems(
        collectionId,
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.status(200).json(successResponse({ items }, 'Collection items retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CollectionController;
