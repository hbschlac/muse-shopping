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
   * Get reviews summary + recent reviews (mock server-side for now)
   */
  static async getItemReviews(itemId, limit = 3, offset = 0, sortBy = 'newest') {
    const summaryQuery = `
      SELECT
        COUNT(*)::int as total_reviews,
        COALESCE(AVG(rating), 0) as rating,
        COUNT(*) FILTER (WHERE rating = 5)::int as count_5,
        COUNT(*) FILTER (WHERE rating = 4)::int as count_4,
        COUNT(*) FILTER (WHERE rating = 3)::int as count_3,
        COUNT(*) FILTER (WHERE rating = 2)::int as count_2,
        COUNT(*) FILTER (WHERE rating = 1)::int as count_1
      FROM item_reviews
      WHERE item_id = $1 AND status = 'published'
    `;

    let orderClause = `ORDER BY COALESCE(r.source_created_at, r.created_at) DESC`;
    if (sortBy === 'helpful') {
      orderClause = `ORDER BY r.helpful_count DESC, COALESCE(r.source_created_at, r.created_at) DESC`;
    }

    const reviewsQuery = `
      SELECT
        r.id,
        r.rating,
        r.title,
        r.body,
        r.helpful_count,
        COALESCE(r.source_created_at, r.created_at) as created_at,
        r.source_retailer,
        r.source_url,
        COALESCE(u.full_name, r.reviewer_name, 'Muse Shopper') as reviewer_name
      FROM item_reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.item_id = $1 AND r.status = 'published'
      ${orderClause}
      LIMIT $2 OFFSET $3
    `;

    const sourcesQuery = `
      SELECT DISTINCT source_retailer
      FROM item_reviews
      WHERE item_id = $1 AND status = 'published' AND source_retailer IS NOT NULL
      ORDER BY source_retailer
    `;

    const [summaryResult, itemsResult, sourcesResult] = await Promise.all([
      pool.query(summaryQuery, [itemId]),
      pool.query(reviewsQuery, [itemId, Math.max(1, limit), Math.max(0, offset)]),
      pool.query(sourcesQuery, [itemId])
    ]);

    const summaryRow = summaryResult.rows[0];
    const total = summaryRow.total_reviews || 0;

    const breakdown = {
      5: total ? summaryRow.count_5 / total : 0,
      4: total ? summaryRow.count_4 / total : 0,
      3: total ? summaryRow.count_3 / total : 0,
      2: total ? summaryRow.count_2 / total : 0,
      1: total ? summaryRow.count_1 / total : 0
    };

    return {
      summary: {
        rating: parseFloat(summaryRow.rating) || 0,
        total_reviews: total,
        breakdown,
        sources: sourcesResult.rows.map(row => row.source_retailer).filter(Boolean)
      },
      pagination: {
        limit: Math.max(1, limit),
        offset: Math.max(0, offset),
        total,
        has_more: Math.max(0, offset) + itemsResult.rows.length < total
      },
      items: itemsResult.rows
    };
  }

  /**
   * Create a new review for an item
   */
  static async createItemReview(itemId, { userId = null, rating, title, body, reviewerName = null }) {
    const query = `
      INSERT INTO item_reviews (item_id, user_id, reviewer_name, rating, title, body, source_retailer)
      VALUES ($1, $2, $3, $4, $5, $6, 'muse')
      RETURNING *
    `;

    const result = await pool.query(query, [
      itemId,
      userId,
      reviewerName,
      rating,
      title || null,
      body
    ]);

    return result.rows[0];
  }

  /**
   * Increment helpful count for a review
   */
  static async incrementReviewHelpful(itemId, reviewId, { userId = null, ipAddress = null } = {}) {
    const ipHash = ipAddress ? this._hashIp(ipAddress) : null;

    if (!userId && !ipHash) {
      return null;
    }

    const insertEvent = `
      INSERT INTO review_helpful_events (review_id, user_id, ip_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    const eventResult = await pool.query(insertEvent, [reviewId, userId, ipHash]);
    if (eventResult.rows.length === 0) {
      return { already_marked: true };
    }

    const query = `
      UPDATE item_reviews
      SET helpful_count = helpful_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND item_id = $2 AND status = 'published'
      RETURNING id, helpful_count
    `;

    const result = await pool.query(query, [reviewId, itemId]);
    return result.rows[0] || null;
  }

  static _hashIp(ipAddress) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ipAddress).digest('hex');
  }

  /**
   * Report a review
   */
  static async reportReview(itemId, reviewId, { userId = null, ipAddress = null, reason = 'inappropriate' } = {}) {
    const ipHash = ipAddress ? this._hashIp(ipAddress) : null;

    const existsQuery = `
      SELECT id FROM item_reviews
      WHERE id = $1 AND item_id = $2 AND status = 'published'
    `;
    const exists = await pool.query(existsQuery, [reviewId, itemId]);
    if (exists.rows.length === 0) {
      return null;
    }

    const query = `
      INSERT INTO review_reports (review_id, user_id, ip_hash, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [reviewId, userId, ipHash, reason]);
    const report = result.rows[0];

    const threshold = parseInt(process.env.REVIEW_REPORT_HIDE_THRESHOLD || '3', 10);
    const countResult = await pool.query(
      'SELECT COUNT(*)::int as total FROM review_reports WHERE review_id = $1',
      [reviewId]
    );
    const total = countResult.rows[0].total || 0;

    if (total >= threshold) {
      await pool.query(
        `UPDATE item_reviews
         SET status = 'hidden', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reviewId]
      );
    }

    return { ...report, report_count: total };
  }

  /**
   * Get PDP bundle (item details + similar items + favorites)
   */
  static async getPdpBundle(itemId, userId = null, options = {}) {
    const { similarLimit = 8 } = options;

    const item = await this.getItemDetails(itemId);
    if (!item) {
      return null;
    }

    const [similarItems, isFavorited] = await Promise.all([
      this.getSimilarItems(itemId, similarLimit),
      userId ? this.isFavorited(userId, itemId) : Promise.resolve(false)
    ]);

    return {
      item: {
        ...item,
        is_favorited: isFavorited
      },
      similar_items: similarItems
    };
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
