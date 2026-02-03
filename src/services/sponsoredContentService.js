/**
 * Sponsored Content Service
 * Manages sponsored content campaigns, serving logic, and tracking
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class SponsoredContentService {
  /**
   * Get eligible campaigns for a user
   * Considers targeting, frequency caps, and budget
   *
   * @param {number} userId - User ID
   * @param {string} placement - Placement slot (e.g., 'homepage_hero', 'newsfeed_position_3')
   * @param {object} userContext - User context (device_type, country_code, etc.)
   * @returns {Promise<Array>} Eligible campaigns sorted by priority
   */
  static async getEligibleCampaigns(userId, placement, userContext = {}) {
    try {
      const query = `
        SELECT
          c.*,
          b.name as brand_name,
          b.logo_url as brand_logo_url,
          -- Check frequency cap
          COALESCE(ucf.impression_count, 0) as today_impression_count,
          -- Calculate remaining budget
          c.budget_amount - COALESCE(
            (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
            0
          ) as remaining_budget
        FROM sponsored_campaigns c
        LEFT JOIN brands b ON c.brand_id = b.id
        LEFT JOIN user_campaign_frequency ucf
          ON c.id = ucf.campaign_id
          AND ucf.user_id = $1
          AND ucf.tracking_date = CURRENT_DATE
        WHERE
          c.is_active = true
          AND c.status = 'active'
          AND c.approval_status = 'approved'
          AND c.start_date <= CURRENT_TIMESTAMP
          AND c.end_date >= CURRENT_TIMESTAMP
          AND $2 = ANY(c.placement_slots)
          -- Check frequency cap
          AND COALESCE(ucf.impression_count, 0) < c.frequency_cap
          -- Check remaining budget
          AND c.budget_amount > COALESCE(
            (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
            0
          )
        ORDER BY c.priority_score DESC, RANDOM()
        LIMIT 10
      `;

      const result = await pool.query(query, [userId, placement]);

      // Filter by targeting criteria
      const eligible = result.rows.filter(campaign => {
        return this.matchesTargeting(campaign, userId, userContext);
      });

      return eligible;
    } catch (error) {
      logger.error('Error getting eligible campaigns:', error);
      return [];
    }
  }

  /**
   * Check if campaign matches user targeting criteria
   *
   * @param {object} campaign - Campaign object
   * @param {number} userId - User ID
   * @param {object} userContext - User context
   * @returns {boolean} Whether campaign matches targeting
   */
  static matchesTargeting(campaign, userId, userContext) {
    const targeting = campaign.target_audience || {};

    // Geographic targeting
    if (campaign.geographic_targeting && campaign.geographic_targeting.length > 0) {
      if (!userContext.country_code || !campaign.geographic_targeting.includes(userContext.country_code)) {
        return false;
      }
    }

    // Additional targeting logic can be added here (age, style profile, etc.)
    // For now, we'll match all campaigns that passed the SQL filters

    return true;
  }

  /**
   * Track impression of sponsored content
   *
   * @param {number} campaignId - Campaign ID
   * @param {number} userId - User ID
   * @param {string} placement - Placement slot
   * @param {object} context - Impression context
   * @returns {Promise<object>} Created impression
   */
  static async trackImpression(campaignId, userId, placement, context = {}) {
    try {
      // Get campaign to calculate cost
      const campaignResult = await pool.query(
        'SELECT budget_type, cost_per_impression FROM sponsored_campaigns WHERE id = $1',
        [campaignId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignResult.rows[0];
      const impressionCost = campaign.budget_type === 'cpm' ? campaign.cost_per_impression : 0;

      // Create impression record
      const impressionQuery = `
        INSERT INTO sponsored_impressions (
          campaign_id,
          user_id,
          session_id,
          placement,
          position_index,
          device_type,
          user_agent,
          ip_address,
          country_code,
          impression_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const impressionResult = await pool.query(impressionQuery, [
        campaignId,
        userId,
        context.sessionId,
        placement,
        context.positionIndex,
        context.deviceType,
        context.userAgent,
        context.ipAddress,
        context.countryCode,
        impressionCost
      ]);

      // Update user frequency cap
      await pool.query(
        `INSERT INTO user_campaign_frequency (user_id, campaign_id, impression_count, last_shown_at, tracking_date)
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_DATE)
         ON CONFLICT (user_id, campaign_id, tracking_date)
         DO UPDATE SET
           impression_count = user_campaign_frequency.impression_count + 1,
           last_shown_at = CURRENT_TIMESTAMP`,
        [userId, campaignId]
      );

      logger.info(`Tracked impression for campaign ${campaignId}, user ${userId}, placement ${placement}`);

      return impressionResult.rows[0];
    } catch (error) {
      logger.error('Error tracking impression:', error);
      throw error;
    }
  }

  /**
   * Track click on sponsored content
   *
   * @param {number} campaignId - Campaign ID
   * @param {number} userId - User ID
   * @param {number} impressionId - Impression ID (optional)
   * @param {object} context - Click context
   * @returns {Promise<object>} Created click
   */
  static async trackClick(campaignId, userId, impressionId, context = {}) {
    try {
      // Get campaign to calculate cost
      const campaignResult = await pool.query(
        'SELECT budget_type, cost_per_click FROM sponsored_campaigns WHERE id = $1',
        [campaignId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignResult.rows[0];
      const clickCost = campaign.budget_type === 'cpc' ? campaign.cost_per_click : 0;

      // Create click record
      const clickQuery = `
        INSERT INTO sponsored_clicks (
          campaign_id,
          impression_id,
          user_id,
          session_id,
          click_type,
          clicked_element,
          destination_url,
          destination_type,
          click_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const clickResult = await pool.query(clickQuery, [
        campaignId,
        impressionId,
        userId,
        context.sessionId,
        context.clickType || 'primary_cta',
        context.clickedElement,
        context.destinationUrl,
        context.destinationType,
        clickCost
      ]);

      logger.info(`Tracked click for campaign ${campaignId}, user ${userId}`);

      return clickResult.rows[0];
    } catch (error) {
      logger.error('Error tracking click:', error);
      throw error;
    }
  }

  /**
   * Track conversion from sponsored content
   *
   * @param {number} campaignId - Campaign ID
   * @param {number} userId - User ID
   * @param {number} clickId - Click ID (optional)
   * @param {object} conversionData - Conversion data
   * @returns {Promise<object>} Created conversion
   */
  static async trackConversion(campaignId, userId, clickId, conversionData = {}) {
    try {
      // Calculate time to conversion if clickId provided
      let timeToConversion = null;
      if (clickId) {
        const clickResult = await pool.query(
          'SELECT clicked_at FROM sponsored_clicks WHERE id = $1',
          [clickId]
        );

        if (clickResult.rows.length > 0) {
          const clickedAt = new Date(clickResult.rows[0].clicked_at);
          const now = new Date();
          timeToConversion = Math.floor((now - clickedAt) / 1000 / 60); // minutes
        }
      }

      // Create conversion record
      const conversionQuery = `
        INSERT INTO sponsored_conversions (
          campaign_id,
          click_id,
          user_id,
          conversion_type,
          conversion_value,
          item_id,
          product_sku,
          time_to_conversion_minutes,
          attribution_model
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const conversionResult = await pool.query(conversionQuery, [
        campaignId,
        clickId,
        userId,
        conversionData.conversionType,
        conversionData.conversionValue,
        conversionData.itemId,
        conversionData.productSku,
        timeToConversion,
        conversionData.attributionModel || 'last_click'
      ]);

      logger.info(`Tracked conversion for campaign ${campaignId}, user ${userId}, type ${conversionData.conversionType}`);

      return conversionResult.rows[0];
    } catch (error) {
      logger.error('Error tracking conversion:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   *
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Campaign details
   */
  static async getCampaign(campaignId) {
    try {
      const query = `
        SELECT
          c.*,
          b.name as brand_name,
          b.logo_url as brand_logo_url,
          u.email as created_by_email,
          -- Calculate metrics
          (SELECT COUNT(*) FROM sponsored_impressions WHERE campaign_id = c.id) as total_impressions,
          (SELECT COUNT(*) FROM sponsored_clicks WHERE campaign_id = c.id) as total_clicks,
          (SELECT COUNT(*) FROM sponsored_conversions WHERE campaign_id = c.id) as total_conversions,
          -- Calculate spend
          c.budget_amount - COALESCE(
            (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
            0
          ) as remaining_budget,
          COALESCE(
            (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
            0
          ) as total_spent
        FROM sponsored_campaigns c
        LEFT JOIN brands b ON c.brand_id = b.id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = $1
      `;

      const result = await pool.query(query, [campaignId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting campaign:', error);
      throw error;
    }
  }

  /**
   * Create new campaign
   *
   * @param {object} campaignData - Campaign data
   * @param {number} createdBy - User ID of creator
   * @returns {Promise<object>} Created campaign
   */
  static async createCampaign(campaignData, createdBy) {
    try {
      const query = `
        INSERT INTO sponsored_campaigns (
          campaign_name,
          campaign_code,
          brand_id,
          sponsor_type,
          sponsor_contact_email,
          title,
          subtitle,
          description,
          call_to_action,
          hero_image_url,
          logo_url,
          banner_image_url,
          video_url,
          target_audience,
          geographic_targeting,
          landing_page_type,
          landing_page_config,
          external_landing_url,
          budget_type,
          budget_amount,
          cost_per_impression,
          cost_per_click,
          daily_budget_cap,
          target_impressions,
          target_clicks,
          target_conversions,
          start_date,
          end_date,
          priority_score,
          placement_slots,
          frequency_cap,
          status,
          created_by,
          internal_notes,
          campaign_tags
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35
        )
        RETURNING *
      `;

      const result = await pool.query(query, [
        campaignData.campaignName,
        campaignData.campaignCode,
        campaignData.brandId,
        campaignData.sponsorType,
        campaignData.sponsorContactEmail,
        campaignData.title,
        campaignData.subtitle,
        campaignData.description,
        campaignData.callToAction || 'Shop Now',
        campaignData.heroImageUrl,
        campaignData.logoUrl,
        campaignData.bannerImageUrl,
        campaignData.videoUrl,
        JSON.stringify(campaignData.targetAudience || {}),
        campaignData.geographicTargeting || [],
        campaignData.landingPageType || 'collection',
        JSON.stringify(campaignData.landingPageConfig || {}),
        campaignData.externalLandingUrl,
        campaignData.budgetType || 'cpm',
        campaignData.budgetAmount,
        campaignData.costPerImpression,
        campaignData.costPerClick,
        campaignData.dailyBudgetCap,
        campaignData.targetImpressions,
        campaignData.targetClicks,
        campaignData.targetConversions,
        campaignData.startDate,
        campaignData.endDate,
        campaignData.priorityScore || 50,
        campaignData.placementSlots || ['homepage_hero'],
        campaignData.frequencyCap || 3,
        campaignData.status || 'draft',
        createdBy,
        campaignData.internalNotes,
        campaignData.campaignTags || []
      ]);

      logger.info(`Created campaign ${result.rows[0].id}: ${campaignData.campaignName}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign
   *
   * @param {number} campaignId - Campaign ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated campaign
   */
  static async updateCampaign(campaignId, updates) {
    try {
      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE sponsored_campaigns
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      values.push(campaignId);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info(`Updated campaign ${campaignId}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Approve campaign
   *
   * @param {number} campaignId - Campaign ID
   * @param {number} approvedBy - User ID of approver
   * @returns {Promise<object>} Updated campaign
   */
  static async approveCampaign(campaignId, approvedBy) {
    try {
      const query = `
        UPDATE sponsored_campaigns
        SET
          approval_status = 'approved',
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          status = 'approved',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [campaignId, approvedBy]);

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info(`Approved campaign ${campaignId} by user ${approvedBy}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Error approving campaign:', error);
      throw error;
    }
  }

  /**
   * Reject campaign
   *
   * @param {number} campaignId - Campaign ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<object>} Updated campaign
   */
  static async rejectCampaign(campaignId, reason) {
    try {
      const query = `
        UPDATE sponsored_campaigns
        SET
          approval_status = 'rejected',
          status = 'rejected',
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [campaignId, reason]);

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info(`Rejected campaign ${campaignId}: ${reason}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Error rejecting campaign:', error);
      throw error;
    }
  }

  /**
   * Activate campaign (start serving)
   *
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Updated campaign
   */
  static async activateCampaign(campaignId) {
    try {
      const query = `
        UPDATE sponsored_campaigns
        SET
          is_active = true,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND approval_status = 'approved'
        RETURNING *
      `;

      const result = await pool.query(query, [campaignId]);

      if (result.rows.length === 0) {
        throw new Error('Campaign not found or not approved');
      }

      logger.info(`Activated campaign ${campaignId}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Error activating campaign:', error);
      throw error;
    }
  }

  /**
   * Pause campaign
   *
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>} Updated campaign
   */
  static async pauseCampaign(campaignId) {
    try {
      const query = `
        UPDATE sponsored_campaigns
        SET
          is_active = false,
          status = 'paused',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [campaignId]);

      if (result.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      logger.info(`Paused campaign ${campaignId}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign performance metrics
   *
   * @param {number} campaignId - Campaign ID
   * @param {Date} startDate - Optional start date for date range
   * @param {Date} endDate - Optional end date for date range
   * @returns {Promise<object>} Performance metrics
   */
  static async getCampaignPerformance(campaignId, startDate = null, endDate = null) {
    try {
      let dateFilter = '';
      const params = [campaignId];

      if (startDate && endDate) {
        dateFilter = 'AND tracking_date BETWEEN $2 AND $3';
        params.push(startDate, endDate);
      }

      const query = `
        SELECT
          SUM(total_impressions) as total_impressions,
          SUM(total_clicks) as total_clicks,
          SUM(total_conversions) as total_conversions,
          SUM(total_spent) as total_spent,
          SUM(total_conversion_value) as total_revenue,
          AVG(ctr) as avg_ctr,
          AVG(conversion_rate) as avg_conversion_rate,
          AVG(cpm) as avg_cpm,
          AVG(cpc) as avg_cpc,
          AVG(cpa) as avg_cpa,
          AVG(roas) as avg_roas
        FROM campaign_budget_tracking
        WHERE campaign_id = $1 ${dateFilter}
      `;

      const result = await pool.query(query, params);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting campaign performance:', error);
      throw error;
    }
  }

  /**
   * Get all campaigns with filters
   *
   * @param {object} filters - Filter criteria
   * @returns {Promise<Array>} Campaigns
   */
  static async getAllCampaigns(filters = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramCount = 1;

      if (filters.status) {
        whereConditions.push(`c.status = $${paramCount}`);
        params.push(filters.status);
        paramCount++;
      }

      if (filters.brandId) {
        whereConditions.push(`c.brand_id = $${paramCount}`);
        params.push(filters.brandId);
        paramCount++;
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(`c.is_active = $${paramCount}`);
        params.push(filters.isActive);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const query = `
        SELECT
          c.*,
          b.name as brand_name,
          (SELECT COUNT(*) FROM sponsored_impressions WHERE campaign_id = c.id) as total_impressions,
          (SELECT COUNT(*) FROM sponsored_clicks WHERE campaign_id = c.id) as total_clicks,
          COALESCE(
            (SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id),
            0
          ) as total_spent
        FROM sponsored_campaigns c
        LEFT JOIN brands b ON c.brand_id = b.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ${filters.limit || 50}
        OFFSET ${filters.offset || 0}
      `;

      const result = await pool.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      throw error;
    }
  }
}

module.exports = SponsoredContentService;
