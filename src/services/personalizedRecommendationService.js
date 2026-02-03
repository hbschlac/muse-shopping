/**
 * Personalized Recommendation Service
 * Recommends items based on user's shopping profile and preferences
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class PersonalizedRecommendationService {
  /**
   * Get personalized item recommendations for a user
   * Uses shopper profile data to find relevant items
   * @param {number} userId - User ID
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} Recommended items
   */
  static async getPersonalizedItems(userId, options = {}) {
    const {
      brandId = null,
      storeId = null,
      category = null,
      limit = 20,
      excludeItemIds = []
    } = options;

    try {
      // Get user's shopper profile
      const profileResult = await pool.query(
        `SELECT
          favorite_categories,
          common_sizes,
          price_range,
          interests
        FROM shopper_profiles
        WHERE user_id = $1`,
        [userId]
      );

      const profile = profileResult.rows[0];

      // If no profile exists, return general recommendations
      if (!profile) {
        return this.getGeneralRecommendations({ brandId, storeId, category, limit, excludeItemIds });
      }

      // Build personalized query based on profile
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
          i.colors,
          i.sizes,
          i.description,
          i.product_url,
          i.is_available,

          -- Scoring for relevance
          (
            -- Category match score (0-50 points)
            CASE
              WHEN i.category = ANY($2) THEN 50
              WHEN i.subcategory = ANY($2) THEN 30
              ELSE 0
            END
            +
            -- Size match score (0-25 points)
            CASE
              WHEN i.sizes && $3 THEN 25
              ELSE 0
            END
            +
            -- Price range score (0-25 points)
            CASE
              WHEN i.price_cents BETWEEN $4 AND $5 THEN 25
              WHEN i.price_cents BETWEEN $4 * 0.7 AND $5 * 1.3 THEN 15
              ELSE 5
            END
          ) as relevance_score

        FROM items i
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE i.is_available = true
      `;

      const params = [
        userId,
        this.extractCategories(profile),
        profile.common_sizes || [],
        profile.price_range?.min || 0,
        profile.price_range?.max || 999999
      ];
      let paramIndex = 6;

      // Add brand filter if specified
      if (brandId) {
        query += ` AND i.brand_id = $${paramIndex}`;
        params.push(brandId);
        paramIndex++;
      }

      // Add store filter if specified
      if (storeId) {
        query += ` AND i.store_id = $${paramIndex}`;
        params.push(storeId);
        paramIndex++;
      }

      // Add category filter if specified
      if (category) {
        query += ` AND i.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      // Exclude specific items
      if (excludeItemIds.length > 0) {
        query += ` AND i.id != ALL($${paramIndex})`;
        params.push(excludeItemIds);
        paramIndex++;
      }

      // Order by relevance and limit
      query += `
        ORDER BY relevance_score DESC, i.created_at DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const result = await pool.query(query, params);

      logger.info(`Generated ${result.rows.length} personalized recommendations for user ${userId}`);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get personalized items:', error);
      throw error;
    }
  }

  /**
   * Get general recommendations (fallback when no profile exists)
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Items
   */
  static async getGeneralRecommendations(options = {}) {
    const {
      brandId = null,
      storeId = null,
      category = null,
      limit = 20,
      excludeItemIds = []
    } = options;

    try {
      let query = `
        SELECT
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
          i.colors,
          i.sizes,
          i.description,
          i.product_url,
          i.is_available
        FROM items i
        LEFT JOIN brands b ON i.brand_id = b.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE i.is_available = true
      `;

      const params = [];
      let paramIndex = 1;

      if (brandId) {
        query += ` AND i.brand_id = $${paramIndex}`;
        params.push(brandId);
        paramIndex++;
      }

      if (storeId) {
        query += ` AND i.store_id = $${paramIndex}`;
        params.push(storeId);
        paramIndex++;
      }

      if (category) {
        query += ` AND i.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (excludeItemIds.length > 0) {
        query += ` AND i.id != ALL($${paramIndex})`;
        params.push(excludeItemIds);
        paramIndex++;
      }

      query += `
        ORDER BY i.created_at DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get general recommendations:', error);
      throw error;
    }
  }

  /**
   * Populate a feed module with personalized items for a user
   * @param {number} userId - User ID
   * @param {number} moduleId - Feed module ID
   * @param {number} limit - Max items to add
   * @returns {Promise<Array>} Added items
   */
  static async populateModuleWithPersonalizedItems(userId, moduleId, limit = 10) {
    try {
      // Get module details
      const moduleResult = await pool.query(
        `SELECT brand_id, module_type, metadata
        FROM feed_modules
        WHERE id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        throw new Error(`Module ${moduleId} not found`);
      }

      const module = moduleResult.rows[0];

      // Get existing items in module
      const existingResult = await pool.query(
        'SELECT item_id FROM feed_module_items WHERE module_id = $1',
        [moduleId]
      );
      const existingItemIds = existingResult.rows.map(r => r.item_id);

      // Get personalized recommendations
      const items = await this.getPersonalizedItems(userId, {
        brandId: module.brand_id,
        category: module.metadata?.category,
        limit,
        excludeItemIds: existingItemIds
      });

      // Add items to module
      const addedItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await pool.query(
          `INSERT INTO feed_module_items (module_id, item_id, display_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (module_id, item_id) DO NOTHING`,
          [moduleId, item.id, existingItemIds.length + i]
        );

        addedItems.push(item);
      }

      logger.info(`Added ${addedItems.length} personalized items to module ${moduleId} for user ${userId}`);
      return addedItems;
    } catch (error) {
      logger.error('Failed to populate module with personalized items:', error);
      throw error;
    }
  }

  /**
   * Get personalized module items (enhanced version of get_module_items)
   * Scores items based on user preferences
   * @param {number} userId - User ID
   * @param {number} moduleId - Module ID
   * @returns {Promise<Array>} Scored and sorted items
   */
  static async getPersonalizedModuleItems(userId, moduleId) {
    try {
      // Get user profile
      const profileResult = await pool.query(
        `SELECT favorite_categories, common_sizes, price_range
        FROM shopper_profiles
        WHERE user_id = $1`,
        [userId]
      );

      const profile = profileResult.rows[0];

      // Get module items with scoring
      let query;
      let params;

      if (profile) {
        // Personalized scoring
        query = `
          SELECT
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
            i.colors,
            i.sizes,
            i.description,
            i.product_url,
            i.is_available,
            fmi.display_order,
            fmi.is_featured,

            -- Personalized relevance score
            (
              CASE WHEN i.category = ANY($2) THEN 50 ELSE 0 END +
              CASE WHEN i.sizes && $3 THEN 25 ELSE 0 END +
              CASE WHEN i.price_cents BETWEEN $4 AND $5 THEN 25 ELSE 5 END
            ) as relevance_score

          FROM feed_module_items fmi
          JOIN items i ON fmi.item_id = i.id
          LEFT JOIN brands b ON i.brand_id = b.id
          LEFT JOIN stores s ON i.store_id = s.id
          WHERE fmi.module_id = $1
          ORDER BY
            fmi.is_featured DESC,
            relevance_score DESC,
            fmi.display_order ASC
        `;

        params = [
          moduleId,
          this.extractCategories(profile),
          profile.common_sizes || [],
          profile.price_range?.min || 0,
          profile.price_range?.max || 999999
        ];
      } else {
        // No profile - just use display order
        query = `
          SELECT
            i.*,
            b.name as brand_name,
            b.logo_url as brand_logo,
            s.name as store_name,
            fmi.display_order,
            fmi.is_featured
          FROM feed_module_items fmi
          JOIN items i ON fmi.item_id = i.id
          LEFT JOIN brands b ON i.brand_id = b.id
          LEFT JOIN stores s ON i.store_id = s.id
          WHERE fmi.module_id = $1
          ORDER BY fmi.is_featured DESC, fmi.display_order ASC
        `;
        params = [moduleId];
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get personalized module items:', error);
      throw error;
    }
  }

  /**
   * Extract category array from shopper profile
   * @param {Object} profile - Shopper profile
   * @returns {Array} Categories
   */
  static extractCategories(profile) {
    if (!profile || !profile.favorite_categories) {
      return [];
    }

    // favorite_categories is JSONB like {"dresses": 5, "tops": 3}
    return Object.keys(profile.favorite_categories);
  }

  /**
   * Get recommendation stats for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Stats
   */
  static async getRecommendationStats(userId) {
    try {
      const result = await pool.query(
        `SELECT
          sp.favorite_categories,
          sp.common_sizes,
          sp.price_range,
          sp.total_orders_analyzed,
          sp.total_items_purchased,
          COUNT(DISTINCT i.id) as available_items_in_profile
        FROM shopper_profiles sp
        CROSS JOIN items i
        WHERE sp.user_id = $1
          AND i.is_available = true
          AND (
            i.category = ANY(SELECT jsonb_object_keys(sp.favorite_categories)::text)
            OR i.sizes && sp.common_sizes
          )
        GROUP BY sp.id`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          has_profile: false,
          message: 'No shopping profile found. Recommendations will be general.'
        };
      }

      return {
        has_profile: true,
        ...result.rows[0]
      };
    } catch (error) {
      logger.error('Failed to get recommendation stats:', error);
      throw error;
    }
  }
}

module.exports = PersonalizedRecommendationService;
