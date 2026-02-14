/**
 * Enhanced Recommendation Service
 * Integrates shopper data, activity tracking, and experiments for personalized recommendations
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const ShopperDataService = require('./shopperDataService');
const ExperimentService = require('./experimentService');

class EnhancedRecommendationService {
  /**
   * Get personalized recommendations with full context
   * Integrates: shopper activity, segments, experiments, 100D profile
   * @param {number} userId - User ID
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Recommendations with metadata
   */
  static async getPersonalizedRecommendations(userId, options = {}) {
    const {
      context = 'newsfeed', // 'newsfeed', 'search', 'product_detail', 'cart'
      limit = 20,
      offset = 0,
      categoryFilter = null,
      brandFilter = null,
      priceRange = null,
      moduleId = null
    } = options;

    try {
      // Get comprehensive shopper context
      const shopperContext = await ShopperDataService.getShopperContextForRecommendations(userId);

      // Check experiment assignment for this module/context
      let experimentVariant = null;
      if (moduleId) {
        experimentVariant = await ExperimentService.getModuleExperimentAssignment(userId, moduleId);
      }

      // Get recommendation algorithm based on experiment or default
      const algorithm = this.selectRecommendationAlgorithm(
        experimentVariant,
        shopperContext.segments
      );

      // Generate recommendations using selected algorithm
      const recommendations = await this.generateRecommendations(
        userId,
        shopperContext,
        algorithm,
        { context, limit, offset, categoryFilter, brandFilter, priceRange }
      );

      // Track this recommendation view (for experiment tracking)
      if (experimentVariant && experimentVariant.in_experiment) {
        await ShopperDataService.trackActivity({
          userId,
          sessionId: options.sessionId || `session_${userId}_${Date.now()}`,
          activityType: 'recommendations_view',
          activityCategory: 'engagement',
          pageType: context,
          experimentId: experimentVariant.experiment_id,
          variantId: experimentVariant.variant_id,
          moduleId,
          interactionData: {
            algorithm,
            recommendationCount: recommendations.length
          }
        });
      }

      return {
        recommendations,
        metadata: {
          algorithm,
          shopperSegments: shopperContext.segments,
          experimentVariant: experimentVariant?.variant_name,
          totalCount: recommendations.length,
          personalizationScore: this.calculatePersonalizationScore(shopperContext)
        }
      };
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Select recommendation algorithm based on experiment and segments
   * @param {Object} experimentVariant - Experiment variant assignment
   * @param {Array} segments - User segments
   * @returns {string} Algorithm name
   */
  static selectRecommendationAlgorithm(experimentVariant, segments) {
    // If in experiment, use variant configuration
    if (experimentVariant && experimentVariant.variant_config) {
      const config = experimentVariant.variant_config;
      if (config.algorithm) {
        return config.algorithm;
      }
    }

    // Default algorithm based on segment
    if (segments.includes('high_value_frequent')) {
      return 'collaborative_filtering_plus';
    } else if (segments.includes('new_shopper')) {
      return 'popularity_based';
    } else if (segments.includes('window_shopper')) {
      return 'similar_items';
    }

    // Default
    return 'hybrid';
  }

  /**
   * Generate recommendations using specified algorithm
   * @param {number} userId - User ID
   * @param {Object} shopperContext - Shopper context
   * @param {string} algorithm - Algorithm to use
   * @param {Object} filters - Filters and options
   * @returns {Promise<Array>} Recommended items
   */
  static async generateRecommendations(userId, shopperContext, algorithm, filters) {
    switch (algorithm) {
      case 'collaborative_filtering_plus':
        return this.collaborativeFilteringRecommendations(userId, shopperContext, filters);

      case 'content_based':
        return this.contentBasedRecommendations(userId, shopperContext, filters);

      case 'popularity_based':
        return this.popularityBasedRecommendations(shopperContext, filters);

      case 'similar_items':
        return this.similarItemsRecommendations(userId, shopperContext, filters);

      case 'hybrid':
      default:
        return this.hybridRecommendations(userId, shopperContext, filters);
    }
  }

  /**
   * Collaborative filtering with enhanced user similarity
   * @param {number} userId - User ID
   * @param {Object} shopperContext - Shopper context
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} Recommendations
   */
  static async collaborativeFilteringRecommendations(userId, shopperContext, filters) {
    const { limit, offset, categoryFilter, brandFilter, priceRange } = filters;

    // Find similar users based on activity patterns and style profile
    const query = `
      WITH similar_users AS (
        -- Find users with similar engagement patterns and style preferences
        SELECT
          sem.user_id,
          -- Calculate similarity score
          (
            -- Segment overlap (40%)
            (SELECT COUNT(*)::FLOAT FROM shopper_segment_membership ssm1
             JOIN shopper_segment_membership ssm2 ON ssm1.segment_id = ssm2.segment_id
             WHERE ssm1.user_id = $1 AND ssm2.user_id = sem.user_id) * 0.4
            +
            -- Activity similarity (30%)
            (1 - ABS(
              (sem.engagement_score - $2) / NULLIF($2, 0)
            )) * 0.3
            +
            -- Purchase behavior similarity (30%)
            (1 - ABS(
              (sem.total_purchases - $3) / NULLIF(GREATEST($3, sem.total_purchases), 0)
            )) * 0.3
          ) as similarity_score
        FROM shopper_engagement_metrics sem
        WHERE sem.user_id != $1
          AND sem.last_activity_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
          AND sem.total_purchases > 0
        ORDER BY similarity_score DESC
        LIMIT 50
      ),
      similar_user_items AS (
        -- Get items that similar users have engaged with
        SELECT DISTINCT ON (sa.item_id)
          sa.item_id,
          su.similarity_score,
          COUNT(*) OVER (PARTITION BY sa.item_id) as interaction_count,
          MAX(sa.occurred_at) OVER (PARTITION BY sa.item_id) as latest_interaction
        FROM similar_users su
        JOIN shopper_activity sa ON su.user_id = sa.user_id
        WHERE sa.activity_type IN ('product_view', 'add_to_cart', 'purchase')
          AND sa.item_id IS NOT NULL
          -- Exclude items user has already seen
          AND sa.item_id NOT IN (
            SELECT DISTINCT item_id FROM shopper_activity
            WHERE user_id = $1 AND item_id IS NOT NULL
          )
      )
      SELECT
        i.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        s.name as store_name,
        sui.similarity_score * sui.interaction_count as recommendation_score
      FROM similar_user_items sui
      JOIN items i ON sui.item_id = i.id
      LEFT JOIN brands b ON i.brand_id = b.id
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.is_available = true
        ${categoryFilter ? 'AND i.category = $4' : ''}
        ${brandFilter ? 'AND i.brand_id = $5' : ''}
        ${priceRange ? 'AND i.price_cents BETWEEN $6 AND $7' : ''}
      ORDER BY recommendation_score DESC, sui.latest_interaction DESC
      LIMIT $8 OFFSET $9
    `;

    const params = [
      userId,
      shopperContext.engagementMetrics?.engagement_score || 0,
      shopperContext.engagementMetrics?.total_purchases || 0
    ];

    let paramIndex = 4;
    if (categoryFilter) params.push(categoryFilter);
    if (brandFilter) params.push(brandFilter);
    if (priceRange) {
      params.push(priceRange.min, priceRange.max);
      paramIndex += 2;
    }
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Content-based recommendations using 100D style profile
   * @param {number} userId - User ID
   * @param {Object} shopperContext - Shopper context
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} Recommendations
   */
  static async contentBasedRecommendations(userId, shopperContext, filters) {
    const { limit, offset, categoryFilter } = filters;
    const styleProfile = shopperContext.styleProfile;

    if (!styleProfile) {
      return this.popularityBasedRecommendations(shopperContext, filters);
    }

    // Use style profile dimensions to find matching items
    // This is simplified - in production, you'd use vector similarity
    const query = `
      SELECT
        i.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        s.name as store_name,
        -- Score based on style profile match
        (
          -- Category match (30%)
          CASE WHEN i.category = ANY($2) THEN 30 ELSE 0 END
          +
          -- Price range match (20%)
          CASE
            WHEN i.price_cents BETWEEN $3 AND $4 THEN 20
            ELSE 0
          END
          +
          -- Brand affinity (25%)
          COALESCE((
            SELECT uba.affinity_score * 25
            FROM user_brand_affinity uba
            WHERE uba.user_id = $1 AND uba.brand_id = i.brand_id
          ), 0)
          +
          -- Recency (25%)
          CASE
            WHEN i.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 25
            WHEN i.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 15
            ELSE 5
          END
        ) as content_score
      FROM items i
      LEFT JOIN brands b ON i.brand_id = b.id
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.is_available = true
        ${categoryFilter ? 'AND i.category = $5' : ''}
        -- Exclude items user has already engaged with
        AND i.id NOT IN (
          SELECT DISTINCT item_id FROM shopper_activity
          WHERE user_id = $1 AND item_id IS NOT NULL
        )
      ORDER BY content_score DESC, i.created_at DESC
      LIMIT $6 OFFSET $7
    `;

    const preferredCategories = styleProfile.preferred_categories || [];
    const priceMin = styleProfile.min_price_cents || 0;
    const priceMax = styleProfile.max_price_cents || 1000000;

    const params = [userId, preferredCategories, priceMin, priceMax];
    if (categoryFilter) params.push(categoryFilter);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Popularity-based recommendations for new users
   * @param {Object} shopperContext - Shopper context
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} Recommendations
   */
  static async popularityBasedRecommendations(shopperContext, filters) {
    const { limit, offset, categoryFilter } = filters;

    const query = `
      SELECT
        i.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        s.name as store_name,
        -- Popularity score
        (
          COALESCE(sa_stats.view_count, 0) * 1 +
          COALESCE(sa_stats.cart_add_count, 0) * 5 +
          COALESCE(sa_stats.purchase_count, 0) * 10
        ) as popularity_score
      FROM items i
      LEFT JOIN brands b ON i.brand_id = b.id
      LEFT JOIN stores s ON i.store_id = s.id
      LEFT JOIN (
        SELECT
          item_id,
          COUNT(*) FILTER (WHERE activity_type = 'product_view') as view_count,
          COUNT(*) FILTER (WHERE activity_type = 'add_to_cart') as cart_add_count,
          COUNT(*) FILTER (WHERE activity_type = 'purchase') as purchase_count
        FROM shopper_activity
        WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
          AND item_id IS NOT NULL
        GROUP BY item_id
      ) sa_stats ON i.id = sa_stats.item_id
      WHERE i.is_available = true
        ${categoryFilter ? 'AND i.category = $1' : ''}
      ORDER BY popularity_score DESC, i.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const params = [];
    if (categoryFilter) params.push(categoryFilter);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Similar items based on recent views
   * @param {number} userId - User ID
   * @param {Object} shopperContext - Shopper context
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} Recommendations
   */
  static async similarItemsRecommendations(userId, shopperContext, filters) {
    const { limit, offset } = filters;

    // Get user's recently viewed items
    const recentViews = shopperContext.recentActivity
      .filter(a => a.type === 'product_view' && a.productId)
      .slice(0, 5)
      .map(a => a.productId);

    if (recentViews.length === 0) {
      return this.popularityBasedRecommendations(shopperContext, filters);
    }

    const query = `
      SELECT DISTINCT
        i.*,
        b.name as brand_name,
        b.logo_url as brand_logo,
        s.name as store_name,
        -- Similarity score based on shared attributes
        (
          CASE WHEN i.category IN (SELECT category FROM items WHERE id = ANY($2)) THEN 30 ELSE 0 END +
          CASE WHEN i.brand_id IN (SELECT brand_id FROM items WHERE id = ANY($2)) THEN 25 ELSE 0 END +
          CASE WHEN i.subcategory IN (SELECT subcategory FROM items WHERE id = ANY($2)) THEN 20 ELSE 0 END
        ) as similarity_score
      FROM items i
      LEFT JOIN brands b ON i.brand_id = b.id
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.is_available = true
        AND i.id != ALL($2)
        -- Must share at least one attribute
        AND (
          i.category IN (SELECT category FROM items WHERE id = ANY($2))
          OR i.brand_id IN (SELECT brand_id FROM items WHERE id = ANY($2))
          OR i.subcategory IN (SELECT subcategory FROM items WHERE id = ANY($2))
        )
      ORDER BY similarity_score DESC, i.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [userId, recentViews, limit, offset]);
    return result.rows;
  }

  /**
   * Hybrid recommendation combining multiple algorithms
   * @param {number} userId - User ID
   * @param {Object} shopperContext - Shopper context
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} Recommendations
   */
  static async hybridRecommendations(userId, shopperContext, filters) {
    const { limit } = filters;

    // Get recommendations from multiple sources
    const [collaborative, contentBased, similar] = await Promise.all([
      this.collaborativeFilteringRecommendations(userId, shopperContext, { ...filters, limit: Math.ceil(limit * 0.4) }),
      this.contentBasedRecommendations(userId, shopperContext, { ...filters, limit: Math.ceil(limit * 0.4) }),
      this.similarItemsRecommendations(userId, shopperContext, { ...filters, limit: Math.ceil(limit * 0.2) })
    ]);

    // Combine and deduplicate
    const seenIds = new Set();
    const combined = [];

    // Interleave results from different sources
    const maxLength = Math.max(collaborative.length, contentBased.length, similar.length);
    for (let i = 0; i < maxLength && combined.length < limit; i++) {
      if (i < collaborative.length && !seenIds.has(collaborative[i].id)) {
        combined.push({ ...collaborative[i], source: 'collaborative' });
        seenIds.add(collaborative[i].id);
      }
      if (i < contentBased.length && !seenIds.has(contentBased[i].id) && combined.length < limit) {
        combined.push({ ...contentBased[i], source: 'content' });
        seenIds.add(contentBased[i].id);
      }
      if (i < similar.length && !seenIds.has(similar[i].id) && combined.length < limit) {
        combined.push({ ...similar[i], source: 'similar' });
        seenIds.add(similar[i].id);
      }
    }

    return combined;
  }

  /**
   * Calculate personalization score
   * Higher score means more personalized (based on data availability)
   * @param {Object} shopperContext - Shopper context
   * @returns {number} Personalization score (0-1)
   */
  static calculatePersonalizationScore(shopperContext) {
    let score = 0;

    // Has engagement metrics (20%)
    if (shopperContext.engagementMetrics?.total_sessions > 0) {
      score += 0.2;
    }

    // Has segments (20%)
    if (shopperContext.segments?.length > 0) {
      score += 0.2;
    }

    // Has recent activity (20%)
    if (shopperContext.recentActivity?.length > 5) {
      score += 0.2;
    }

    // Has style profile (20%)
    if (shopperContext.styleProfile) {
      score += 0.2;
    }

    // Is in experiments (20%)
    if (shopperContext.activeExperiments?.length > 0) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }
}

module.exports = EnhancedRecommendationService;
