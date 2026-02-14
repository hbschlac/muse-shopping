/**
 * Recommendation Tabs Service
 * Handles brand-agnostic tabbed recommendations for homepage
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const PersonalizedRecommendationService = require('./personalizedRecommendationService');

class RecommendationTabsService {
  /**
   * Get all active tabs
   * @returns {Promise<Array>} Active tabs
   */
  static async getActiveTabs() {
    try {
      const result = await pool.query(
        `SELECT id, tab_key, display_name, icon, display_order, metadata
        FROM recommendation_tabs
        WHERE is_active = true
        ORDER BY display_order ASC`
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get active tabs:', error);
      throw error;
    }
  }

  /**
   * Get items for a specific tab
   * @param {number} userId - User ID
   * @param {string} tabKey - Tab identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Items for the tab
   */
  static async getTabItems(userId, tabKey, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      let items;

      switch (tabKey) {
        case 'recommended':
          items = await this.getRecommendedItems(userId, { limit, offset, currentItemId });
          break;
        case 'new_arrivals':
          items = await this.getNewArrivals(userId, { limit, offset, currentItemId });
          break;
        case 'trending':
          items = await this.getTrendingItems(userId, { limit, offset, currentItemId });
          break;
        case 'sale':
          items = await this.getSaleItems(userId, { limit, offset, currentItemId });
          break;
        case 'under_100':
          items = await this.getUnder100Items(userId, { limit, offset, currentItemId });
          break;
        case 'designer':
          items = await this.getDesignerItems(userId, { limit, offset, currentItemId });
          break;
        default:
          items = await this.getRecommendedItems(userId, { limit, offset, currentItemId });
      }

      // Track tab view
      await this.trackTabView(userId, tabKey);

      return items;
    } catch (error) {
      logger.error(`Failed to get items for tab ${tabKey}:`, error);
      throw error;
    }
  }

  /**
   * Get recommended items for user (personalized)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Recommended items
   */
  static async getRecommendedItems(userId, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      // Use personalized recommendation service
      const excludeItems = currentItemId ? [currentItemId] : [];
      const items = await PersonalizedRecommendationService.getPersonalizedItems(userId, {
        limit,
        excludeItemIds: excludeItems
      });

      return items;
    } catch (error) {
      logger.error('Failed to get recommended items:', error);
      throw error;
    }
  }

  /**
   * Get new arrivals (last 30 days)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} New arrival items
   */
  static async getNewArrivals(userId, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      // Get user profile for personalization
      const profileResult = await pool.query(
        `SELECT favorite_categories, common_sizes, price_range
        FROM shopper_profiles
        WHERE user_id = $1`,
        [userId]
      );

      const profile = profileResult.rows[0];

      let query = `
        SELECT DISTINCT
          i.id,
          i.name,
          i.category,
          i.subcategory,
          i.price_cents,
          i.original_price_cents,
          i.brand_id,
          b.name as brand_name,
          b.logo_url as brand_logo,
          i.store_id,
          s.name as store_name,
          i.image_url,
          i.media_type,
          i.video_url,
          i.video_poster_url,
          i.colors,
          i.sizes,
          i.description,
          i.product_url,
          i.is_available,
          i.created_at
        FROM items i
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE i.is_available = true
          AND i.created_at >= NOW() - INTERVAL '30 days'
      `;

      const params = [];
      let paramIndex = 1;

      if (currentItemId) {
        query += ` AND i.id != $${paramIndex}`;
        params.push(currentItemId);
        paramIndex++;
      }

      // Boost items matching user profile
      if (profile) {
        query += `
          ORDER BY
            -- Prioritize items in user's favorite categories
            CASE WHEN i.category = ANY($${paramIndex}) THEN 1 ELSE 0 END DESC,
            i.created_at DESC
          LIMIT $${paramIndex + 1}
          OFFSET $${paramIndex + 2}
        `;
        params.push(
          Object.keys(profile.favorite_categories || {}),
          limit,
          offset
        );
      } else {
        query += `
          ORDER BY i.created_at DESC
          LIMIT $${paramIndex}
          OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get new arrivals:', error);
      throw error;
    }
  }

  /**
   * Get trending items (most viewed/clicked in last 7 days)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Trending items
   */
  static async getTrendingItems(userId, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      let query = `
        SELECT DISTINCT
          i.id,
          i.name,
          i.category,
          i.subcategory,
          i.price_cents,
          i.original_price_cents,
          i.brand_id,
          b.name as brand_name,
          b.logo_url as brand_logo,
          i.store_id,
          s.name as store_name,
          i.image_url,
          i.media_type,
          i.video_url,
          i.video_poster_url,
          i.colors,
          i.sizes,
          i.description,
          i.product_url,
          i.is_available,
          COUNT(DISTINCT umi.user_id) as interaction_count
        FROM items i
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN stores s ON i.store_id = s.id
        LEFT JOIN user_module_interactions umi ON i.id = umi.item_id
          AND umi.created_at >= NOW() - INTERVAL '7 days'
        WHERE i.is_available = true
      `;

      const params = [];
      let paramIndex = 1;

      if (currentItemId) {
        query += ` AND i.id != $${paramIndex}`;
        params.push(currentItemId);
        paramIndex++;
      }

      query += `
        GROUP BY i.id, b.id, s.id
        ORDER BY interaction_count DESC, i.created_at DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get trending items:', error);
      throw error;
    }
  }

  /**
   * Get sale items
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Sale items
   */
  static async getSaleItems(userId, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      let query = `
        SELECT DISTINCT
          i.id,
          i.name,
          i.category,
          i.subcategory,
          i.price_cents,
          i.original_price_cents,
          i.brand_id,
          b.name as brand_name,
          b.logo_url as brand_logo,
          i.store_id,
          s.name as store_name,
          i.image_url,
          i.media_type,
          i.video_url,
          i.video_poster_url,
          i.colors,
          i.sizes,
          i.description,
          i.product_url,
          i.is_available,
          -- Calculate discount percentage
          ROUND(((i.original_price_cents - i.price_cents)::DECIMAL / i.original_price_cents) * 100) as discount_pct
        FROM items i
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE i.is_available = true
          AND i.original_price_cents IS NOT NULL
          AND i.original_price_cents > i.price_cents
      `;

      const params = [];
      let paramIndex = 1;

      if (currentItemId) {
        query += ` AND i.id != $${paramIndex}`;
        params.push(currentItemId);
        paramIndex++;
      }

      query += `
        ORDER BY discount_pct DESC, i.created_at DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get sale items:', error);
      throw error;
    }
  }

  /**
   * Get items under $100
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Items under $100
   */
  static async getUnder100Items(userId, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      // Use personalized recommendations but filter by price
      const excludeItems = currentItemId ? [currentItemId] : [];
      const items = await PersonalizedRecommendationService.getPersonalizedItems(userId, {
        limit: limit * 2, // Get more to filter
        excludeItemIds: excludeItems
      });

      // Filter to under $100 and slice
      const under100 = items
        .filter(item => (item.price_cents || 0) < 10000)
        .slice(offset, offset + limit);

      return under100;
    } catch (error) {
      logger.error('Failed to get under $100 items:', error);
      throw error;
    }
  }

  /**
   * Get designer items (premium brands)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Designer items
   */
  static async getDesignerItems(userId, options = {}) {
    const { limit = 20, offset = 0, currentItemId = null } = options;

    try {
      let query = `
        SELECT DISTINCT
          i.id,
          i.name,
          i.category,
          i.subcategory,
          i.price_cents,
          i.original_price_cents,
          i.brand_id,
          b.name as brand_name,
          b.logo_url as brand_logo,
          i.store_id,
          s.name as store_name,
          i.image_url,
          i.media_type,
          i.video_url,
          i.video_poster_url,
          i.colors,
          i.sizes,
          i.description,
          i.product_url,
          i.is_available
        FROM items i
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE i.is_available = true
          AND i.price_cents >= 20000 -- $200+
      `;

      const params = [];
      let paramIndex = 1;

      if (currentItemId) {
        query += ` AND i.id != $${paramIndex}`;
        params.push(currentItemId);
        paramIndex++;
      }

      query += `
        ORDER BY i.price_cents DESC, i.created_at DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get designer items:', error);
      throw error;
    }
  }

  /**
   * Track tab view
   * @param {number} userId - User ID
   * @param {string} tabKey - Tab identifier
   */
  static async trackTabView(userId, tabKey) {
    try {
      await pool.query(
        `INSERT INTO user_tab_preferences (user_id, tab_key, view_count, last_viewed_at)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (user_id, tab_key)
        DO UPDATE SET
          view_count = user_tab_preferences.view_count + 1,
          last_viewed_at = NOW()`,
        [userId, tabKey]
      );
    } catch (error) {
      logger.error('Failed to track tab view:', error);
      // Don't throw - tracking is non-critical
    }
  }

  /**
   * Track tab item click
   * @param {number} userId - User ID
   * @param {string} tabKey - Tab identifier
   */
  static async trackTabItemClick(userId, tabKey) {
    try {
      await pool.query(
        `INSERT INTO user_tab_preferences (user_id, tab_key, items_clicked)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, tab_key)
        DO UPDATE SET
          items_clicked = user_tab_preferences.items_clicked + 1`,
        [userId, tabKey]
      );
    } catch (error) {
      logger.error('Failed to track tab item click:', error);
      // Don't throw - tracking is non-critical
    }
  }

  /**
   * Get user's most viewed tabs (for personalization)
   * @param {number} userId - User ID
   * @param {number} limit - Number of tabs to return
   * @returns {Promise<Array>} Most viewed tabs
   */
  static async getUserTopTabs(userId, limit = 3) {
    try {
      const result = await pool.query(
        `SELECT tab_key, view_count, items_clicked
        FROM user_tab_preferences
        WHERE user_id = $1
        ORDER BY view_count DESC, items_clicked DESC
        LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user top tabs:', error);
      throw error;
    }
  }
}

module.exports = RecommendationTabsService;
