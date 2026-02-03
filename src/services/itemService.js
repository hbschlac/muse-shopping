const Item = require('../models/Item');
const pool = require('../db/pool');

class ItemService {
  /**
   * Browse/discover items with filters and pagination
   */
  static async discoverItems(filters, pagination) {
    const { limit = 50, offset = 0 } = pagination;

    // Get items and total count in parallel
    const [items, total] = await Promise.all([
      Item.findAll({ ...filters, limit, offset }),
      Item.count(filters)
    ]);

    return {
      items,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + items.length < total,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get complete item details including listings and attributes
   */
  static async getItemDetails(itemId) {
    const item = await Item.findById(itemId);

    if (!item) {
      return null;
    }

    // Get listings, attributes in parallel
    const [listings, attributes] = await Promise.all([
      Item.getListings(itemId),
      Item.getAttributes(itemId)
    ]);

    // Calculate best price
    const bestPrice = this._calculateBestPrice(listings);

    // Group attributes by category
    const attributesByCategory = this._groupAttributesByCategory(attributes);

    return {
      ...item,
      listings,
      attributes: attributesByCategory,
      best_price: bestPrice,
      listing_count: listings.length
    };
  }

  /**
   * Get similar items (for recommendations)
   */
  static async getSimilarItems(itemId, limit = 10) {
    return await Item.findSimilar(itemId, limit);
  }

  /**
   * Search items by keyword
   */
  static async searchItems(query, filters = {}, pagination = {}) {
    return await this.discoverItems(
      { ...filters, search: query },
      pagination
    );
  }

  /**
   * Get personalized discover feed (items from followed brands)
   */
  static async getPersonalizedDiscover(userId, filters = {}, pagination = {}) {
    // Get user's followed brands
    const followedBrandsQuery = `
      SELECT brand_id
      FROM user_brand_follows
      WHERE user_id = $1
    `;
    const result = await pool.query(followedBrandsQuery, [userId]);
    const followedBrandIds = result.rows.map(row => row.brand_id);

    if (followedBrandIds.length === 0) {
      // User doesn't follow any brands yet, return general discover
      return await this.discoverItems(filters, pagination);
    }

    // Filter by followed brands
    return await this.discoverItems(
      { ...filters, brands: followedBrandIds },
      pagination
    );
  }

  /**
   * Get filter options for discovery UI
   */
  static async getFilterOptions() {
    return await Item.getFilterOptions();
  }

  /**
   * Track item view (for behavioral learning)
   */
  static async trackItemView(userId, itemId, context = {}) {
    const query = `
      INSERT INTO user_item_interactions (user_id, item_id, interaction_type, context)
      VALUES ($1, $2, 'view', $3)
      RETURNING *
    `;

    const result = await pool.query(query, [userId, itemId, JSON.stringify(context)]);
    return result.rows[0];
  }

  /**
   * Track item click (click to retailer)
   */
  static async trackItemClick(userId, itemId, listingId = null, context = {}) {
    const query = `
      INSERT INTO user_item_interactions (user_id, item_id, interaction_type, context)
      VALUES ($1, $2, 'click', $3)
      RETURNING *
    `;

    const enrichedContext = {
      ...context,
      listing_id: listingId
    };

    const result = await pool.query(query, [userId, itemId, JSON.stringify(enrichedContext)]);
    return result.rows[0];
  }

  /**
   * Add item to favorites
   */
  static async addToFavorites(userId, itemId, notes = null) {
    const query = `
      INSERT INTO user_favorites (user_id, item_id, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, item_id) DO UPDATE
      SET notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [userId, itemId, notes]);
    return result.rows[0];
  }

  /**
   * Remove item from favorites
   */
  static async removeFromFavorites(userId, itemId) {
    const query = `
      DELETE FROM user_favorites
      WHERE user_id = $1 AND item_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [userId, itemId]);
    return result.rows[0] || null;
  }

  /**
   * Get user's favorites
   */
  static async getUserFavorites(userId, limit = 50, offset = 0) {
    const query = `
      SELECT
        uf.id as favorite_id,
        uf.notes,
        uf.created_at as favorited_at,
        i.id,
        i.brand_id,
        b.name as brand_name,
        b.logo_url as brand_logo,
        i.canonical_name,
        i.description,
        i.category,
        i.subcategory,
        i.primary_image_url,
        MIN(il.price) as min_price,
        MIN(il.sale_price) as sale_price
      FROM user_favorites uf
      JOIN items i ON uf.item_id = i.id
      JOIN brands b ON i.brand_id = b.id
      LEFT JOIN item_listings il ON i.id = il.item_id AND il.in_stock = TRUE
      WHERE uf.user_id = $1
      GROUP BY uf.id, i.id, b.id, b.name, b.logo_url
      ORDER BY uf.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_favorites
      WHERE user_id = $1
    `;

    const [items, countResult] = await Promise.all([
      pool.query(query, [userId, limit, offset]),
      pool.query(countQuery, [userId])
    ]);

    const total = parseInt(countResult.rows[0].total);

    return {
      items: items.rows,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + items.rows.length < total
      }
    };
  }

  /**
   * Check if item is in user's favorites
   */
  static async isFavorited(userId, itemId) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM user_favorites
        WHERE user_id = $1 AND item_id = $2
      ) as is_favorited
    `;

    const result = await pool.query(query, [userId, itemId]);
    return result.rows[0].is_favorited;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate best price from listings
   */
  static _calculateBestPrice(listings) {
    if (listings.length === 0) return null;

    const prices = listings
      .filter(l => l.in_stock)
      .map(l => ({
        regular: parseFloat(l.price),
        sale: l.sale_price ? parseFloat(l.sale_price) : null,
        retailer: l.retailer_name,
        url: l.affiliate_url || l.product_url
      }));

    if (prices.length === 0) return null;

    // Find lowest price (considering sale prices)
    let best = prices[0];
    prices.forEach(p => {
      const currentBest = best.sale || best.regular;
      const thisPrice = p.sale || p.regular;
      if (thisPrice < currentBest) {
        best = p;
      }
    });

    return {
      price: best.sale || best.regular,
      was: best.sale ? best.regular : null,
      retailer: best.retailer,
      url: best.url
    };
  }

  /**
   * Group attributes by category for cleaner response
   */
  static _groupAttributesByCategory(attributes) {
    const grouped = {};

    attributes.forEach(attr => {
      const category = attr.attribute_category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        name: attr.name,
        display_name: attr.display_name,
        confidence: parseFloat(attr.confidence)
      });
    });

    return grouped;
  }
}

module.exports = ItemService;
