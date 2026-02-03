/**
 * Instagram-Enhanced Recommendation Service
 * Extends PersonalizedRecommendationService with Instagram style insights
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const PersonalizedRecommendationService = require('./personalizedRecommendationService');

class InstagramEnhancedRecommendationService {
  /**
   * Get combined recommendation score using both email shopping data and Instagram insights
   * @param {number} userId - User ID
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} Recommended items with combined scoring
   */
  static async getEnhancedPersonalizedItems(userId, options = {}) {
    const {
      brandId = null,
      storeId = null,
      category = null,
      limit = 20,
      excludeItemIds = []
    } = options;

    try {
      // Get shopper profile (from email analysis)
      const shopperProfile = await this.getShopperProfile(userId);

      // Get Instagram style insights
      const instagramInsights = await this.getInstagramInsights(userId);

      // If neither exists, use base recommendations
      if (!shopperProfile && !instagramInsights) {
        return PersonalizedRecommendationService.getPersonalizedItems(userId, options);
      }

      // Build enhanced scoring query
      const query = this.buildEnhancedScoringQuery(shopperProfile, instagramInsights);
      const params = this.buildQueryParams(userId, shopperProfile, instagramInsights, {
        brandId,
        storeId,
        category,
        limit,
        excludeItemIds
      });

      const result = await pool.query(query, params);

      logger.info(`Enhanced recommendations for user ${userId}: ${result.rows.length} items (email: ${!!shopperProfile}, instagram: ${!!instagramInsights})`);

      return result.rows;
    } catch (error) {
      logger.error(`Error getting enhanced recommendations for user ${userId}:`, error);
      // Fallback to base recommendations
      return PersonalizedRecommendationService.getPersonalizedItems(userId, options);
    }
  }

  /**
   * Get user's shopper profile from email analysis
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Shopper profile or null
   */
  static async getShopperProfile(userId) {
    const result = await pool.query(
      `SELECT
        favorite_categories,
        common_sizes,
        price_range,
        interests
      FROM shopper_profiles
      WHERE user_id = $1`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get user's Instagram style insights
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Instagram insights or null
   */
  static async getInstagramInsights(userId) {
    const result = await pool.query(
      `SELECT
        top_categories,
        aesthetic_preferences,
        preferred_colors,
        price_tier_preference,
        favorite_brands,
        overall_confidence
      FROM instagram_style_insights
      WHERE user_id = $1
        AND sync_status = 'completed'
        AND overall_confidence >= 40`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Build enhanced scoring SQL query that combines email and Instagram data
   * @param {Object} shopperProfile - Shopper profile from email
   * @param {Object} instagramInsights - Instagram style insights
   * @returns {string} SQL query
   */
  static buildEnhancedScoringQuery(shopperProfile, instagramInsights) {
    const hasEmailData = !!shopperProfile;
    const hasInstagramData = !!instagramInsights;

    // Weight distribution (adjustable based on confidence)
    const emailWeight = hasEmailData ? 0.6 : 0; // 60% weight to actual purchase history
    const instagramWeight = hasInstagramData ? 0.4 : 0; // 40% weight to style inspiration

    return `
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

        -- Combined scoring from email + Instagram
        ROUND(
          (
            ${hasEmailData ? `
            -- Email-based scoring (60% weight)
            (
              -- Category match from purchase history (0-50 points)
              CASE
                WHEN i.category = ANY($2) THEN 50
                WHEN i.subcategory = ANY($2) THEN 30
                ELSE 0
              END
              +
              -- Size match from purchase history (0-25 points)
              CASE
                WHEN i.sizes && $3 THEN 25
                ELSE 0
              END
              +
              -- Price range from purchase history (0-25 points)
              CASE
                WHEN i.price_cents BETWEEN $4 AND $5 THEN 25
                WHEN i.price_cents BETWEEN $4 * 0.7 AND $5 * 1.3 THEN 15
                ELSE 5
              END
            ) * ${emailWeight}
            ` : '0'}

            ${hasEmailData && hasInstagramData ? '+' : ''}

            ${hasInstagramData ? `
            -- Instagram-based scoring (40% weight)
            (
              -- Category match from followed influencers (0-40 points)
              CASE
                WHEN i.category = ANY($${hasEmailData ? '6' : '2'}) THEN 40
                WHEN i.subcategory = ANY($${hasEmailData ? '6' : '2'}) THEN 25
                ELSE 0
              END
              +
              -- Brand match from influencer content (0-30 points)
              CASE
                WHEN b.name = ANY($${hasEmailData ? '7' : '3'}) THEN 30
                WHEN b.name ILIKE ANY($${hasEmailData ? '7' : '3'}) THEN 20
                ELSE 0
              END
              +
              -- Price tier alignment (0-30 points)
              CASE
                WHEN (
                  ($${hasEmailData ? '8' : '4'} = 'luxury' AND i.price_cents >= 20000) OR
                  ($${hasEmailData ? '8' : '4'} = 'premium' AND i.price_cents BETWEEN 10000 AND 30000) OR
                  ($${hasEmailData ? '8' : '4'} = 'mid-range' AND i.price_cents BETWEEN 3000 AND 15000) OR
                  ($${hasEmailData ? '8' : '4'} = 'budget' AND i.price_cents < 5000)
                ) THEN 30
                ELSE 10
              END
            ) * ${instagramWeight}
            ` : '0'}
          ),
          2
        ) as relevance_score,

        -- Metadata for transparency
        '${hasEmailData ? 'email+instagram' : hasInstagramData ? 'instagram' : 'general'}' as recommendation_source

      FROM items i
      LEFT JOIN brands b ON i.brand_id = b.id
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.is_available = true
        AND i.is_active = true
        ${hasEmailData || hasInstagramData ? 'AND (' : ''}
        ${hasEmailData ? `
          i.category = ANY($2) OR
          i.subcategory = ANY($2) OR
          i.sizes && $3
        ` : ''}
        ${hasEmailData && hasInstagramData ? 'OR' : ''}
        ${hasInstagramData ? `
          i.category = ANY($${hasEmailData ? '6' : '2'}) OR
          b.name = ANY($${hasEmailData ? '7' : '3'})
        ` : ''}
        ${hasEmailData || hasInstagramData ? ')' : ''}
    `;
  }

  /**
   * Build query parameters array
   * @param {number} userId - User ID
   * @param {Object} shopperProfile - Shopper profile
   * @param {Object} instagramInsights - Instagram insights
   * @param {Object} options - Additional options
   * @returns {Array} Query parameters
   */
  static buildQueryParams(userId, shopperProfile, instagramInsights, options) {
    const params = [userId];

    // Email-based params
    if (shopperProfile) {
      params.push(this.extractCategories(shopperProfile)); // $2
      params.push(shopperProfile.common_sizes || []); // $3
      params.push(shopperProfile.price_range?.min || 0); // $4
      params.push(shopperProfile.price_range?.max || 100000); // $5
    }

    // Instagram-based params
    if (instagramInsights) {
      params.push(this.extractInstagramCategories(instagramInsights)); // $6 (or $2 if no email)
      params.push(instagramInsights.favorite_brands || []); // $7 (or $3)
      params.push(instagramInsights.price_tier_preference || 'mid-range'); // $8 (or $4)
    }

    // Additional filters
    if (options.brandId) {
      params.push(options.brandId);
    }

    if (options.storeId) {
      params.push(options.storeId);
    }

    if (options.category) {
      params.push(options.category);
    }

    if (options.excludeItemIds && options.excludeItemIds.length > 0) {
      params.push(options.excludeItemIds);
    }

    params.push(options.limit || 20);

    return params;
  }

  /**
   * Extract top categories from shopper profile
   * @param {Object} profile - Shopper profile
   * @returns {Array} Array of category names
   */
  static extractCategories(profile) {
    if (!profile.favorite_categories) return [];

    const categories = typeof profile.favorite_categories === 'string'
      ? JSON.parse(profile.favorite_categories)
      : profile.favorite_categories;

    return Object.keys(categories);
  }

  /**
   * Extract top categories from Instagram insights
   * @param {Object} insights - Instagram insights
   * @returns {Array} Array of category names
   */
  static extractInstagramCategories(insights) {
    if (!insights.top_categories) return [];

    const categories = typeof insights.top_categories === 'string'
      ? JSON.parse(insights.top_categories)
      : insights.top_categories;

    // Return top categories (score > 10)
    return Object.entries(categories)
      .filter(([, score]) => score > 10)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
  }

  /**
   * Get recommendation stats including Instagram data
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Combined recommendation stats
   */
  static async getRecommendationStats(userId) {
    const shopperProfile = await this.getShopperProfile(userId);
    const instagramInsights = await this.getInstagramInsights(userId);

    const stats = {
      has_email_data: !!shopperProfile,
      has_instagram_data: !!instagramInsights,
      recommendation_sources: []
    };

    if (shopperProfile) {
      stats.recommendation_sources.push('email');
      stats.email_stats = {
        favorite_categories: shopperProfile.favorite_categories,
        common_sizes: shopperProfile.common_sizes,
        price_range: shopperProfile.price_range
      };
    }

    if (instagramInsights) {
      stats.recommendation_sources.push('instagram');
      stats.instagram_stats = {
        top_categories: instagramInsights.top_categories,
        aesthetic_preferences: instagramInsights.aesthetic_preferences,
        preferred_colors: instagramInsights.preferred_colors,
        price_tier_preference: instagramInsights.price_tier_preference,
        favorite_brands: instagramInsights.favorite_brands,
        confidence: instagramInsights.overall_confidence
      };
    }

    if (!shopperProfile && !instagramInsights) {
      stats.recommendation_sources.push('general');
    }

    return stats;
  }

  /**
   * Get aesthetic-based recommendations
   * Finds items that match user's aesthetic preferences from Instagram
   * @param {number} userId - User ID
   * @param {Object} options - Options
   * @returns {Promise<Array>} Aesthetic-matched items
   */
  static async getAestheticRecommendations(userId, options = {}) {
    const { limit = 20 } = options;

    const instagramInsights = await this.getInstagramInsights(userId);

    if (!instagramInsights || !instagramInsights.aesthetic_preferences) {
      return [];
    }

    const aesthetics = Array.isArray(instagramInsights.aesthetic_preferences)
      ? instagramInsights.aesthetic_preferences
      : [];

    if (aesthetics.length === 0) return [];

    // Map aesthetics to item tags/categories
    // This requires items table to have aesthetic tags
    const query = `
      SELECT
        i.*,
        b.name as brand_name,
        s.name as store_name,
        100 as relevance_score,
        'aesthetic_match' as match_type
      FROM items i
      LEFT JOIN brands b ON i.brand_id = b.id
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.is_available = true
        AND i.is_active = true
        -- Would match on aesthetic tags if items table had them
      ORDER BY i.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

module.exports = InstagramEnhancedRecommendationService;
