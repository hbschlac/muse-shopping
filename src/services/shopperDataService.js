/**
 * Shopper Data Service
 * Manages shopper information with security, privacy, and activity tracking
 * Connected to experimentation and recommendation systems
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const ExperimentService = require('./experimentService');

class ShopperDataService {
  // ============================================================================
  // ACTIVITY TRACKING
  // ============================================================================

  /**
   * Track shopper activity
   * Automatically integrates with experiment tracking
   * @param {Object} activityData - Activity data
   * @returns {Promise<void>}
   */
  static async trackActivity(activityData) {
    const {
      userId,
      sessionId,
      activityType,
      activityCategory,
      pageUrl = null,
      pageType = null,
      referrerUrl = null,
      productId = null,
      brandId = null,
      itemId = null,
      searchQuery = null,
      searchFilters = null,
      interactionData = {},
      experimentId = null,
      variantId = null,
      moduleId = null,
      positionInFeed = null,
      deviceType = null,
      browser = null,
      platform = null,
      viewportWidth = null,
      viewportHeight = null,
      durationSeconds = null
    } = activityData;

    // Check privacy consent before tracking
    const hasConsent = await this.hasPrivacyConsent(userId, 'data_collection');
    if (!hasConsent) {
      logger.info(`User ${userId} has not consented to data collection. Skipping activity tracking.`);
      return;
    }

    try {
      const query = `
        INSERT INTO shopper_activity (
          user_id, session_id, activity_type, activity_category,
          page_url, page_type, referrer_url,
          product_id, brand_id, item_id,
          search_query, search_filters, interaction_data,
          experiment_id, variant_id, module_id, position_in_feed,
          device_type, browser, platform,
          viewport_width, viewport_height, duration_seconds,
          occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const result = await pool.query(query, [
        userId, sessionId, activityType, activityCategory,
        pageUrl, pageType, referrerUrl,
        productId, brandId, itemId,
        searchQuery, searchFilters ? JSON.stringify(searchFilters) : null,
        JSON.stringify(interactionData),
        experimentId, variantId, moduleId, positionInFeed,
        deviceType, browser, platform,
        viewportWidth, viewportHeight, durationSeconds
      ]);

      // Update engagement metrics (handled by trigger)
      // Update style profile based on activity
      if (productId || brandId) {
        await this.updateStyleProfileFromActivity(userId, { productId, brandId, activityType });
      }

      logger.debug(`Activity tracked: user=${userId}, type=${activityType}, id=${result.rows[0].id}`);
    } catch (error) {
      logger.error('Error tracking shopper activity:', error);
      throw error;
    }
  }

  /**
   * Update user's style profile based on activity
   * Enhances the 100D profile with implicit preferences
   * @param {number} userId - User ID
   * @param {Object} context - Activity context
   */
  static async updateStyleProfileFromActivity(userId, context) {
    const { productId, brandId, activityType } = context;

    try {
      // Get product/brand metadata
      let productData = null;
      if (productId) {
        const productResult = await pool.query(
          'SELECT category, style_tags, price_cents FROM product_catalog WHERE id = $1',
          [productId]
        );
        productData = productResult.rows[0];
      }

      // Weight based on activity type
      const activityWeights = {
        'product_view': 1,
        'click': 2,
        'add_to_cart': 5,
        'wishlist_add': 3,
        'purchase': 10
      };
      const weight = activityWeights[activityType] || 1;

      // Update style profile dimensions based on product attributes
      if (productData) {
        // This is simplified - in production, you'd extract more dimensions
        await pool.query(`
          UPDATE style_profiles
          SET
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `, [userId]);
      }

      logger.debug(`Style profile updated for user ${userId} based on ${activityType}`);
    } catch (error) {
      logger.error('Error updating style profile from activity:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get shopper activity history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Activity records
   */
  static async getShopperActivity(userId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      activityTypes = null,
      startDate = null,
      endDate = null,
      includeAnonymized = false
    } = options;

    let whereConditions = ['user_id = $1'];
    let params = [userId];
    let paramIndex = 2;

    if (activityTypes && activityTypes.length > 0) {
      whereConditions.push(`activity_type = ANY($${paramIndex})`);
      params.push(activityTypes);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`occurred_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`occurred_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (!includeAnonymized) {
      whereConditions.push('anonymized = false');
    }

    params.push(limit, offset);

    const query = `
      SELECT
        id, activity_type, activity_category, page_type,
        product_id, brand_id, item_id, search_query,
        experiment_id, variant_id, module_id, position_in_feed,
        duration_seconds, occurred_at, anonymized
      FROM shopper_activity
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY occurred_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ============================================================================
  // ENGAGEMENT METRICS
  // ============================================================================

  /**
   * Get shopper engagement metrics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Engagement metrics
   */
  static async getEngagementMetrics(userId) {
    const query = `
      SELECT * FROM shopper_engagement_metrics
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Calculate engagement score for a shopper
   * Based on multiple factors weighted by importance
   * @param {number} userId - User ID
   * @returns {Promise<number>} Engagement score (0-1)
   */
  static async calculateEngagementScore(userId) {
    const metrics = await this.getEngagementMetrics(userId);
    if (!metrics) return 0;

    // Weighted scoring algorithm
    const scores = {
      recency: this.calculateRecencyScore(metrics.days_since_last_activity),
      frequency: this.calculateFrequencyScore(metrics.total_sessions),
      conversion: metrics.conversion_rate || 0,
      revenue: this.calculateRevenueScore(metrics.total_revenue_cents),
      engagement: this.calculateActivityScore(metrics.total_clicks, metrics.total_page_views)
    };

    const weights = {
      recency: 0.25,
      frequency: 0.20,
      conversion: 0.25,
      revenue: 0.20,
      engagement: 0.10
    };

    const engagementScore = Object.keys(scores).reduce((total, key) => {
      return total + (scores[key] * weights[key]);
    }, 0);

    // Update the score in database
    await pool.query(
      'UPDATE shopper_engagement_metrics SET engagement_score = $1, metrics_calculated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [engagementScore, userId]
    );

    return engagementScore;
  }

  static calculateRecencyScore(daysSinceLastActivity) {
    if (daysSinceLastActivity === null) return 0;
    if (daysSinceLastActivity <= 1) return 1;
    if (daysSinceLastActivity <= 7) return 0.8;
    if (daysSinceLastActivity <= 30) return 0.5;
    if (daysSinceLastActivity <= 90) return 0.2;
    return 0.1;
  }

  static calculateFrequencyScore(totalSessions) {
    if (totalSessions >= 50) return 1;
    if (totalSessions >= 20) return 0.8;
    if (totalSessions >= 10) return 0.6;
    if (totalSessions >= 5) return 0.4;
    return 0.2;
  }

  static calculateRevenueScore(totalRevenueCents) {
    if (totalRevenueCents >= 100000) return 1; // $1000+
    if (totalRevenueCents >= 50000) return 0.8; // $500+
    if (totalRevenueCents >= 20000) return 0.6; // $200+
    if (totalRevenueCents >= 5000) return 0.4; // $50+
    return 0.2;
  }

  static calculateActivityScore(totalClicks, totalPageViews) {
    const engagementRatio = totalPageViews > 0 ? totalClicks / totalPageViews : 0;
    if (engagementRatio >= 0.5) return 1;
    if (engagementRatio >= 0.3) return 0.8;
    if (engagementRatio >= 0.2) return 0.6;
    if (engagementRatio >= 0.1) return 0.4;
    return 0.2;
  }

  // ============================================================================
  // SEGMENTATION
  // ============================================================================

  /**
   * Evaluate and assign shopper to segments
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Assigned segments
   */
  static async evaluateShopperSegments(userId) {
    const metrics = await this.getEngagementMetrics(userId);
    if (!metrics) return [];

    // Get all active segments
    const segmentsResult = await pool.query(
      'SELECT * FROM shopper_segments WHERE is_active = true ORDER BY priority DESC'
    );

    const segments = segmentsResult.rows;
    const assignedSegments = [];

    for (const segment of segments) {
      const criteria = segment.criteria;
      const confidence = this.evaluateSegmentCriteria(metrics, criteria);

      if (confidence > 0.5) {
        // Assign to segment
        await pool.query(`
          INSERT INTO shopper_segment_membership (user_id, segment_id, confidence_score, evaluation_data)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, segment_id) DO UPDATE SET
            confidence_score = $3,
            last_evaluated_at = CURRENT_TIMESTAMP,
            evaluation_data = $4
        `, [userId, segment.id, confidence, JSON.stringify({ metrics })]);

        assignedSegments.push({
          ...segment,
          confidence
        });
      } else {
        // Remove from segment if exists
        await pool.query(
          'DELETE FROM shopper_segment_membership WHERE user_id = $1 AND segment_id = $2',
          [userId, segment.id]
        );
      }
    }

    logger.info(`User ${userId} assigned to ${assignedSegments.length} segments`);
    return assignedSegments;
  }

  /**
   * Evaluate if metrics match segment criteria
   * @param {Object} metrics - User metrics
   * @param {Object} criteria - Segment criteria
   * @returns {number} Confidence score (0-1)
   */
  static evaluateSegmentCriteria(metrics, criteria) {
    let matchCount = 0;
    let totalCriteria = 0;

    for (const [key, value] of Object.entries(criteria)) {
      totalCriteria++;

      switch (key) {
        case 'min_purchases':
          if (metrics.total_purchases >= value) matchCount++;
          break;
        case 'max_purchases':
          if (metrics.total_purchases <= value) matchCount++;
          break;
        case 'min_revenue_cents':
          if (metrics.total_revenue_cents >= value) matchCount++;
          break;
        case 'min_sessions':
          if (metrics.total_sessions >= value) matchCount++;
          break;
        case 'max_days_since_first_activity':
          if (metrics.days_since_first_activity <= value) matchCount++;
          break;
        case 'min_days_since_last_activity':
          if (metrics.days_since_last_activity >= value) matchCount++;
          break;
        case 'days_since_last_purchase':
          // Would need additional query to calculate this
          matchCount += 0.5; // Partial credit
          break;
        case 'min_engagement_score':
          if (metrics.engagement_score >= value) matchCount++;
          break;
        case 'min_cart_adds':
          if (metrics.total_cart_adds >= value) matchCount++;
          break;
        case 'min_product_views':
          if (metrics.total_product_views >= value) matchCount++;
          break;
      }
    }

    return totalCriteria > 0 ? matchCount / totalCriteria : 0;
  }

  /**
   * Get shopper segments
   * @param {number} userId - User ID
   * @returns {Promise<Array>} User's segments
   */
  static async getShopperSegments(userId) {
    const query = `
      SELECT
        s.id, s.segment_name, s.segment_key, s.description,
        ssm.confidence_score, ssm.joined_at, ssm.last_evaluated_at
      FROM shopper_segment_membership ssm
      JOIN shopper_segments s ON ssm.segment_id = s.id
      WHERE ssm.user_id = $1
      ORDER BY ssm.confidence_score DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // ============================================================================
  // PRIVACY & CONSENT
  // ============================================================================

  /**
   * Check if user has given privacy consent
   * @param {number} userId - User ID
   * @param {string} consentType - Type of consent to check
   * @returns {Promise<boolean>} Whether user has consented
   */
  static async hasPrivacyConsent(userId, consentType) {
    const query = `SELECT has_privacy_consent($1, $2) as has_consent`;
    const result = await pool.query(query, [userId, consentType]);
    return result.rows[0]?.has_consent || false;
  }

  /**
   * Update privacy consent
   * @param {number} userId - User ID
   * @param {Object} consents - Consent settings
   * @param {Object} context - Request context (IP, user agent)
   * @returns {Promise<void>}
   */
  static async updatePrivacyConsent(userId, consents, context = {}) {
    const { ipAddress, userAgent, consentMethod = 'settings_update', consentVersion = '1.0' } = context;

    try {
      // Update user's consent settings
      const updateQuery = `
        UPDATE users
        SET
          privacy_consent = privacy_consent || $1::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      const consentData = {
        ...consents,
        consented_at: new Date().toISOString(),
        ip_address: ipAddress
      };

      await pool.query(updateQuery, [JSON.stringify(consentData), userId]);

      // Log each consent change
      for (const [consentType, consentGiven] of Object.entries(consents)) {
        await pool.query(`
          INSERT INTO privacy_consent_log (
            user_id, consent_type, consent_given, consent_version,
            ip_address, user_agent, consent_method
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, consentType, consentGiven, consentVersion, ipAddress, userAgent, consentMethod]);
      }

      logger.info(`Privacy consent updated for user ${userId}`);
    } catch (error) {
      logger.error('Error updating privacy consent:', error);
      throw error;
    }
  }

  /**
   * Anonymize user data (GDPR right to be forgotten)
   * @param {number} userId - User ID
   * @param {string} reason - Reason for anonymization
   * @returns {Promise<void>}
   */
  static async anonymizeUserData(userId, reason = 'user_request') {
    try {
      await pool.query('SELECT anonymize_user_data($1, $2)', [userId, reason]);
      logger.info(`User ${userId} data anonymized. Reason: ${reason}`);
    } catch (error) {
      logger.error('Error anonymizing user data:', error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR data portability)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Complete user data
   */
  static async exportUserData(userId) {
    try {
      // Get user profile
      const userResult = await pool.query(`
        SELECT id, email, username, full_name, created_at, privacy_consent, shopping_metadata
        FROM users WHERE id = $1
      `, [userId]);

      // Get engagement metrics
      const metricsResult = await pool.query(
        'SELECT * FROM shopper_engagement_metrics WHERE user_id = $1',
        [userId]
      );

      // Get style profile
      const styleResult = await pool.query(
        'SELECT * FROM style_profiles WHERE user_id = $1',
        [userId]
      );

      // Get activity history (last 1000 records)
      const activityResult = await pool.query(`
        SELECT * FROM shopper_activity
        WHERE user_id = $1 AND anonymized = false
        ORDER BY occurred_at DESC
        LIMIT 1000
      `, [userId]);

      // Get segments
      const segments = await this.getShopperSegments(userId);

      // Log data access
      await pool.query(`
        INSERT INTO data_access_logs (
          accessor_user_id, subject_user_id, data_type, access_type, purpose, records_accessed
        ) VALUES ($1, $1, 'full_export', 'export', 'user_data_export', $2)
      `, [userId, activityResult.rows.length]);

      return {
        user: userResult.rows[0],
        engagementMetrics: metricsResult.rows[0],
        styleProfile: styleResult.rows[0],
        activityHistory: activityResult.rows,
        segments,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error exporting user data:', error);
      throw error;
    }
  }

  // ============================================================================
  // RECOMMENDATION INTEGRATION
  // ============================================================================

  /**
   * Get enriched shopper context for recommendations
   * Combines activity, segments, and style profile
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Shopper context
   */
  static async getShopperContextForRecommendations(userId) {
    try {
      // Get engagement metrics
      const metrics = await this.getEngagementMetrics(userId);

      // Get segments
      const segments = await this.getShopperSegments(userId);

      // Get recent activity
      const recentActivity = await this.getShopperActivity(userId, {
        limit: 50,
        activityTypes: ['product_view', 'click', 'add_to_cart', 'purchase']
      });

      // Get style profile
      const styleProfileResult = await pool.query(
        'SELECT * FROM style_profiles WHERE user_id = $1',
        [userId]
      );

      // Get experiment assignments
      const experimentsResult = await pool.query(`
        SELECT e.name, e.target, ev.name as variant_name, ev.config
        FROM user_experiment_assignments uea
        JOIN experiments e ON uea.experiment_id = e.id
        JOIN experiment_variants ev ON uea.variant_id = ev.id
        WHERE uea.user_id = $1 AND e.status IN ('running', 'active')
      `, [userId]);

      return {
        userId,
        engagementMetrics: metrics,
        segments: segments.map(s => s.segment_key),
        recentActivity: recentActivity.map(a => ({
          type: a.activity_type,
          productId: a.product_id,
          brandId: a.brand_id,
          timestamp: a.occurred_at
        })),
        styleProfile: styleProfileResult.rows[0],
        activeExperiments: experimentsResult.rows,
        contextGeneratedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting shopper context for recommendations:', error);
      throw error;
    }
  }
}

module.exports = ShopperDataService;
