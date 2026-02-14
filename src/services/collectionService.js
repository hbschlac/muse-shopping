const Collection = require('../models/Collection');
const Item = require('../models/Item');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

class CollectionService {
  /**
   * Create a new collection
   */
  static async createCollection(userId, data) {
    const { name, description, is_private } = data;

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Collection name is required');
    }

    if (name.length > 255) {
      throw new ValidationError('Collection name must be 255 characters or less');
    }

    const collection = await Collection.create({
      user_id: userId,
      name: name.trim(),
      description: description?.trim() || null,
      is_private: is_private || false,
    });

    return {
      ...collection,
      item_count: 0,
    };
  }

  /**
   * Get user's collections
   */
  static async getUserCollections(userId, limit = 50, offset = 0) {
    const collections = await Collection.findByUserId(userId, limit, offset);
    const total = await Collection.countByUserId(userId);

    return {
      collections,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get collection by ID
   */
  static async getCollectionById(collectionId, userId) {
    const collection = await Collection.findById(collectionId);

    if (!collection) {
      throw new NotFoundError('Collection');
    }

    // Check ownership
    if (collection.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this collection');
    }

    const items = await Collection.getItems(collectionId);

    return {
      ...collection,
      items,
      item_count: items.length,
    };
  }

  /**
   * Update collection
   */
  static async updateCollection(collectionId, userId, data) {
    const collection = await Collection.findById(collectionId);

    if (!collection) {
      throw new NotFoundError('Collection');
    }

    // Check ownership
    if (collection.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this collection');
    }

    const { name, description, is_private } = data;
    const updates = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        throw new ValidationError('Collection name cannot be empty');
      }
      if (name.length > 255) {
        throw new ValidationError('Collection name must be 255 characters or less');
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (is_private !== undefined) {
      updates.is_private = is_private;
    }

    const updatedCollection = await Collection.update(collectionId, updates);
    return updatedCollection;
  }

  /**
   * Delete collection
   */
  static async deleteCollection(collectionId, userId) {
    const collection = await Collection.findById(collectionId);

    if (!collection) {
      throw new NotFoundError('Collection');
    }

    // Check ownership
    if (collection.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this collection');
    }

    await Collection.delete(collectionId);
  }

  /**
   * Add item to collection
   */
  static async addItemToCollection(collectionId, userId, itemId, notes = null) {
    // Check collection ownership
    const isOwner = await Collection.verifyOwnership(collectionId, userId);
    if (!isOwner) {
      throw new ForbiddenError('You do not have access to this collection');
    }

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Item');
    }

    const collectionItem = await Collection.addItem({
      collection_id: collectionId,
      item_id: itemId,
      notes,
    });

    return collectionItem;
  }

  /**
   * Remove item from collection
   */
  static async removeItemFromCollection(collectionId, userId, itemId) {
    // Check collection ownership
    const isOwner = await Collection.verifyOwnership(collectionId, userId);
    if (!isOwner) {
      throw new ForbiddenError('You do not have access to this collection');
    }

    await Collection.removeItem(collectionId, itemId);
  }

  /**
   * Get items in a collection
   */
  static async getCollectionItems(collectionId, userId, limit = 50, offset = 0) {
    // Check collection ownership
    const isOwner = await Collection.verifyOwnership(collectionId, userId);
    if (!isOwner) {
      throw new ForbiddenError('You do not have access to this collection');
    }

    const items = await Collection.getItems(collectionId, limit, offset);
    return items;
  }
}

module.exports = CollectionService;
