const pool = require('../db/pool');
const logger = require('../config/logger');

class CuratedCampaignService {
  /**
   * Get eligible curated campaigns for a specific placement
   * @param {string} userId - User ID
   * @param {string} placementSlot - Where to show the campaign
   * @param {number} limit - Max campaigns to return
   * @returns {Promise<Array>} - List of eligible campaigns
   */
  async getEligibleCampaigns(userId, placementSlot, limit = 5) {
    try {
      const result = await pool.query(
        `SELECT * FROM get_eligible_curated_campaigns($1, $2, $3)`,
        [userId, placementSlot, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting eligible curated campaigns:', error);
      throw error;
    }
  }

  /**
   * Get items for a specific campaign
   * @param {string} campaignId - Campaign ID
   * @param {number} limit - Max items to return
   * @returns {Promise<Array>} - List of items in campaign
   */
  async getCampaignItems(campaignId, limit = 20) {
    try {
      const result = await pool.query(
        `SELECT * FROM get_curated_campaign_items($1, $2)`,
        [campaignId, limit]
      );

      return result.rows.map(row => ({
        itemId: row.item_id,
        position: row.position,
        customTitle: row.custom_title,
        customDescription: row.custom_description,
        customImageUrl: row.custom_image_url,
        name: row.item_name,
        brand: row.brand_name,
        price: parseFloat(row.price),
        salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
        imageUrl: row.image_url
      }));
    } catch (error) {
      logger.error('Error getting campaign items:', error);
      throw error;
    }
  }

  /**
   * Get full campaign details including items
   * @param {string} campaignId - Campaign ID
   * @param {string} userId - User ID (for personalization)
   * @returns {Promise<Object>} - Complete campaign object
   */
  async getCampaignDetails(campaignId, userId = null) {
    try {
      const campaignResult = await pool.query(
        `SELECT
          id,
          name,
          description,
          campaign_type,
          status,
          starts_at,
          ends_at,
          placement_slot,
          priority,
          hero_image_url,
          thumbnail_url,
          background_color,
          text_color,
          headline,
          subheadline,
          call_to_action,
          cta_url,
          target_audience,
          geographic_targeting
        FROM curated_campaigns
        WHERE id = $1`,
        [campaignId]
      );

      if (campaignResult.rows.length === 0) {
        return null;
      }

      const campaign = campaignResult.rows[0];

      // Get items for this campaign
      const items = await this.getCampaignItems(campaignId);

      // Get collections linked to this campaign
      const collectionsResult = await pool.query(
        `SELECT
          cc.id,
          cc.name,
          cc.description,
          cc.collection_type
        FROM curated_collections cc
        JOIN curated_campaign_collections ccc ON cc.id = ccc.collection_id
        WHERE ccc.campaign_id = $1`,
        [campaignId]
      );

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        campaignType: campaign.campaign_type,
        status: campaign.status,
        startsAt: campaign.starts_at,
        endsAt: campaign.ends_at,
        placementSlot: campaign.placement_slot,
        priority: campaign.priority,
        heroImageUrl: campaign.hero_image_url,
        thumbnailUrl: campaign.thumbnail_url,
        backgroundColor: campaign.background_color,
        textColor: campaign.text_color,
        headline: campaign.headline,
        subheadline: campaign.subheadline,
        callToAction: campaign.call_to_action,
        ctaUrl: campaign.cta_url,
        targetAudience: campaign.target_audience,
        geographicTargeting: campaign.geographic_targeting,
        items: items,
        collections: collectionsResult.rows
      };
    } catch (error) {
      logger.error('Error getting campaign details:', error);
      throw error;
    }
  }

  /**
   * Create a new curated campaign
   * @param {Object} campaignData - Campaign configuration
   * @returns {Promise<Object>} - Created campaign
   */
  async createCampaign(campaignData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const {
        name,
        description,
        campaignType,
        placementSlot,
        priority = 100,
        startsAt,
        endsAt,
        heroImageUrl,
        thumbnailUrl,
        backgroundColor,
        textColor,
        headline,
        subheadline,
        callToAction,
        ctaUrl,
        targetAudience = {},
        geographicTargeting = {},
        maxImpressionsPerUser,
        showToNewUsersOnly = false,
        createdBy,
        items = [], // Array of {itemId, position, customTitle, customDescription, customImageUrl}
        collectionIds = []
      } = campaignData;

      // Create campaign
      const campaignResult = await client.query(
        `INSERT INTO curated_campaigns (
          name, description, campaign_type, placement_slot, priority,
          starts_at, ends_at, hero_image_url, thumbnail_url,
          background_color, text_color, headline, subheadline,
          call_to_action, cta_url, target_audience, geographic_targeting,
          max_impressions_per_user, show_to_new_users_only, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          name, description, campaignType, placementSlot, priority,
          startsAt, endsAt, heroImageUrl, thumbnailUrl,
          backgroundColor, textColor, headline, subheadline,
          callToAction, ctaUrl, JSON.stringify(targetAudience), JSON.stringify(geographicTargeting),
          maxImpressionsPerUser, showToNewUsersOnly, createdBy
        ]
      );

      const campaign = campaignResult.rows[0];

      // Add items to campaign
      if (items.length > 0) {
        const itemValues = items.map((item, index) =>
          `('${campaign.id}', '${item.itemId}', ${item.position || index}, ${item.customTitle ? `'${item.customTitle}'` : 'NULL'}, ${item.customDescription ? `'${item.customDescription}'` : 'NULL'}, ${item.customImageUrl ? `'${item.customImageUrl}'` : 'NULL'}, '${createdBy}')`
        ).join(',');

        await client.query(
          `INSERT INTO curated_campaign_items (
            campaign_id, item_id, position, custom_title, custom_description, custom_image_url, added_by
          ) VALUES ${itemValues}`
        );
      }

      // Link collections to campaign
      if (collectionIds.length > 0) {
        const collectionValues = collectionIds.map(collectionId =>
          `('${campaign.id}', '${collectionId}')`
        ).join(',');

        await client.query(
          `INSERT INTO curated_campaign_collections (campaign_id, collection_id)
          VALUES ${collectionValues}`
        );
      }

      await client.query('COMMIT');

      logger.info(`Created curated campaign: ${campaign.id} - ${name}`);

      return this.getCampaignDetails(campaign.id);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating curated campaign:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated campaign
   */
  async updateCampaign(campaignId, updates) {
    try {
      const allowedFields = [
        'name', 'description', 'campaign_type', 'status', 'placement_slot', 'priority',
        'starts_at', 'ends_at', 'hero_image_url', 'thumbnail_url',
        'background_color', 'text_color', 'headline', 'subheadline',
        'call_to_action', 'cta_url', 'target_audience', 'geographic_targeting',
        'max_impressions_per_user', 'show_to_new_users_only'
      ];

      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(['target_audience', 'geographic_targeting'].includes(dbField)
            ? JSON.stringify(value)
            : value
          );
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return this.getCampaignDetails(campaignId);
      }

      values.push(campaignId);

      await pool.query(
        `UPDATE curated_campaigns
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}`,
        values
      );

      logger.info(`Updated curated campaign: ${campaignId}`);

      return this.getCampaignDetails(campaignId);
    } catch (error) {
      logger.error('Error updating curated campaign:', error);
      throw error;
    }
  }

  /**
   * Add items to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Array} items - Items to add
   * @param {string} addedBy - User ID adding items
   * @returns {Promise<void>}
   */
  async addItemsToCampaign(campaignId, items, addedBy) {
    try {
      const values = items.map(item =>
        `('${campaignId}', '${item.itemId}', ${item.position || 'NULL'}, ${item.customTitle ? `'${item.customTitle}'` : 'NULL'}, ${item.customDescription ? `'${item.customDescription}'` : 'NULL'}, ${item.customImageUrl ? `'${item.customImageUrl}'` : 'NULL'}, '${addedBy}')`
      ).join(',');

      await pool.query(
        `INSERT INTO curated_campaign_items (
          campaign_id, item_id, position, custom_title, custom_description, custom_image_url, added_by
        ) VALUES ${values}
        ON CONFLICT (campaign_id, item_id) DO NOTHING`
      );

      logger.info(`Added ${items.length} items to campaign: ${campaignId}`);
    } catch (error) {
      logger.error('Error adding items to campaign:', error);
      throw error;
    }
  }

  /**
   * Remove items from a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Array<string>} itemIds - Item IDs to remove
   * @returns {Promise<void>}
   */
  async removeItemsFromCampaign(campaignId, itemIds) {
    try {
      await pool.query(
        `DELETE FROM curated_campaign_items
        WHERE campaign_id = $1 AND item_id = ANY($2)`,
        [campaignId, itemIds]
      );

      logger.info(`Removed ${itemIds.length} items from campaign: ${campaignId}`);
    } catch (error) {
      logger.error('Error removing items from campaign:', error);
      throw error;
    }
  }

  /**
   * Track campaign impression
   * @param {string} campaignId - Campaign ID
   * @param {string} userId - User ID
   * @param {Object} context - Additional context
   * @returns {Promise<string>} - Impression ID
   */
  async trackImpression(campaignId, userId, context = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Record impression
      const impressionResult = await client.query(
        `INSERT INTO curated_campaign_impressions (
          campaign_id, user_id, placement_shown, device_type, view_duration_seconds, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          campaignId,
          userId,
          context.placementShown || null,
          context.deviceType || null,
          context.viewDurationSeconds || null,
          context.sessionId || null
        ]
      );

      const impressionId = impressionResult.rows[0].id;

      // Update frequency cap
      await client.query(
        `INSERT INTO user_curated_campaign_frequency (user_id, campaign_id, impression_count, last_shown_at)
        VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, campaign_id)
        DO UPDATE SET
          impression_count = user_curated_campaign_frequency.impression_count + 1,
          last_shown_at = CURRENT_TIMESTAMP`,
        [userId, campaignId]
      );

      await client.query('COMMIT');

      logger.debug(`Tracked impression for campaign ${campaignId}`);

      return impressionId;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error tracking campaign impression:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Track campaign click
   * @param {string} campaignId - Campaign ID
   * @param {string} userId - User ID
   * @param {Object} clickData - Click details
   * @returns {Promise<string>} - Click ID
   */
  async trackClick(campaignId, userId, clickData = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO curated_campaign_clicks (
          campaign_id, impression_id, user_id, clicked_item_id, click_type, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          campaignId,
          clickData.impressionId || null,
          userId,
          clickData.clickedItemId || null,
          clickData.clickType || 'hero_cta',
          clickData.sessionId || null
        ]
      );

      logger.debug(`Tracked click for campaign ${campaignId}`);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error tracking campaign click:', error);
      throw error;
    }
  }

  /**
   * Track campaign conversion
   * @param {string} campaignId - Campaign ID
   * @param {string} userId - User ID
   * @param {Object} conversionData - Conversion details
   * @returns {Promise<string>} - Conversion ID
   */
  async trackConversion(campaignId, userId, conversionData = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO curated_campaign_conversions (
          campaign_id, click_id, user_id, conversion_type, item_id, conversion_value, time_to_conversion_seconds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          campaignId,
          conversionData.clickId || null,
          userId,
          conversionData.conversionType || 'add_to_cart',
          conversionData.itemId || null,
          conversionData.conversionValue || null,
          conversionData.timeToConversionSeconds || null
        ]
      );

      logger.debug(`Tracked conversion for campaign ${campaignId}`);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error tracking campaign conversion:', error);
      throw error;
    }
  }

  /**
   * Get campaign performance analytics
   * @param {string} campaignId - Campaign ID
   * @param {Object} options - Query options (dateRange, etc)
   * @returns {Promise<Object>} - Performance metrics
   */
  async getCampaignPerformance(campaignId, options = {}) {
    try {
      let whereClause = 'WHERE campaign_id = $1';
      const params = [campaignId];
      let paramIndex = 2;

      if (options.startDate) {
        whereClause += ` AND viewed_at >= $${paramIndex}`;
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClause += ` AND viewed_at <= $${paramIndex}`;
        params.push(options.endDate);
        paramIndex++;
      }

      const result = await pool.query(
        `SELECT * FROM curated_campaign_performance WHERE campaign_id = $1`,
        [campaignId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const performance = result.rows[0];

      // Get daily breakdown
      const dailyResult = await pool.query(
        `SELECT
          DATE(viewed_at) as date,
          COUNT(DISTINCT i.id) as impressions,
          COUNT(DISTINCT i.user_id) as unique_users,
          COUNT(DISTINCT c.id) as clicks,
          COUNT(DISTINCT cv.id) as conversions,
          COALESCE(SUM(cv.conversion_value), 0) as conversion_value
        FROM curated_campaign_impressions i
        LEFT JOIN curated_campaign_clicks c ON i.campaign_id = c.campaign_id AND DATE(i.viewed_at) = DATE(c.clicked_at)
        LEFT JOIN curated_campaign_conversions cv ON i.campaign_id = cv.campaign_id AND DATE(i.viewed_at) = DATE(cv.converted_at)
        ${whereClause}
        GROUP BY DATE(viewed_at)
        ORDER BY DATE(viewed_at) DESC
        LIMIT 30`,
        params
      );

      return {
        campaignId: performance.campaign_id,
        campaignName: performance.name,
        campaignType: performance.campaign_type,
        placementSlot: performance.placement_slot,
        totalImpressions: parseInt(performance.total_impressions),
        uniqueUsersReached: parseInt(performance.unique_users_reached),
        totalClicks: parseInt(performance.total_clicks),
        totalConversions: parseInt(performance.total_conversions),
        totalConversionValue: parseFloat(performance.total_conversion_value),
        ctrPercentage: parseFloat(performance.ctr_percentage),
        conversionRatePercentage: parseFloat(performance.conversion_rate_percentage),
        dailyBreakdown: dailyResult.rows.map(row => ({
          date: row.date,
          impressions: parseInt(row.impressions),
          uniqueUsers: parseInt(row.unique_users),
          clicks: parseInt(row.clicks),
          conversions: parseInt(row.conversions),
          conversionValue: parseFloat(row.conversion_value)
        }))
      };
    } catch (error) {
      logger.error('Error getting campaign performance:', error);
      throw error;
    }
  }

  /**
   * List all campaigns with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - List of campaigns
   */
  async listCampaigns(filters = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      if (filters.status) {
        whereConditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.campaignType) {
        whereConditions.push(`campaign_type = $${paramIndex}`);
        params.push(filters.campaignType);
        paramIndex++;
      }

      if (filters.placementSlot) {
        whereConditions.push(`placement_slot = $${paramIndex}`);
        params.push(filters.placementSlot);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const result = await pool.query(
        `SELECT
          id,
          name,
          description,
          campaign_type,
          status,
          starts_at,
          ends_at,
          placement_slot,
          priority,
          headline,
          created_at
        FROM curated_campaigns
        ${whereClause}
        ORDER BY priority DESC, created_at DESC
        LIMIT ${filters.limit || 50}
        OFFSET ${filters.offset || 0}`,
        params
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        campaignType: row.campaign_type,
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        placementSlot: row.placement_slot,
        priority: row.priority,
        headline: row.headline,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error listing campaigns:', error);
      throw error;
    }
  }

  /**
   * Delete a campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<void>}
   */
  async deleteCampaign(campaignId) {
    try {
      await pool.query(
        `DELETE FROM curated_campaigns WHERE id = $1`,
        [campaignId]
      );

      logger.info(`Deleted curated campaign: ${campaignId}`);
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign counts by status
   * @returns {Promise<Object>} - Status counts
   */
  async getCampaignCountsByStatus() {
    try {
      const result = await pool.query(
        `SELECT status, COUNT(*) as count
        FROM curated_campaigns
        GROUP BY status`
      );

      const counts = {
        draft: 0,
        scheduled: 0,
        active: 0,
        paused: 0,
        completed: 0,
        archived: 0
      };

      result.rows.forEach(row => {
        counts[row.status] = parseInt(row.count);
      });

      return counts;
    } catch (error) {
      logger.error('Error getting campaign counts:', error);
      throw error;
    }
  }

  /**
   * Get overview of all campaigns
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Overview metrics
   */
  async getCampaignsOverview(options = {}) {
    try {
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (options.startDate) {
        whereClause += ` AND i.viewed_at >= $${paramIndex}`;
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClause += ` AND i.viewed_at <= $${paramIndex}`;
        params.push(options.endDate);
        paramIndex++;
      }

      const result = await pool.query(
        `SELECT
          COUNT(DISTINCT c.id) as total_campaigns,
          COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_campaigns,
          COUNT(DISTINCT i.id) as total_impressions,
          COUNT(DISTINCT i.user_id) as unique_users_reached,
          COUNT(DISTINCT cl.id) as total_clicks,
          COUNT(DISTINCT cv.id) as total_conversions,
          COALESCE(SUM(cv.conversion_value), 0) as total_conversion_value,
          CASE
            WHEN COUNT(DISTINCT i.id) > 0
            THEN ROUND((COUNT(DISTINCT cl.id)::NUMERIC / COUNT(DISTINCT i.id) * 100), 2)
            ELSE 0
          END as overall_ctr,
          CASE
            WHEN COUNT(DISTINCT cl.id) > 0
            THEN ROUND((COUNT(DISTINCT cv.id)::NUMERIC / COUNT(DISTINCT cl.id) * 100), 2)
            ELSE 0
          END as overall_conversion_rate
        FROM curated_campaigns c
        LEFT JOIN curated_campaign_impressions i ON c.id = i.campaign_id ${whereClause}
        LEFT JOIN curated_campaign_clicks cl ON c.id = cl.campaign_id
        LEFT JOIN curated_campaign_conversions cv ON c.id = cv.campaign_id`,
        params
      );

      const overview = result.rows[0];

      return {
        totalCampaigns: parseInt(overview.total_campaigns),
        activeCampaigns: parseInt(overview.active_campaigns),
        totalImpressions: parseInt(overview.total_impressions),
        uniqueUsersReached: parseInt(overview.unique_users_reached),
        totalClicks: parseInt(overview.total_clicks),
        totalConversions: parseInt(overview.total_conversions),
        totalConversionValue: parseFloat(overview.total_conversion_value),
        overallCtr: parseFloat(overview.overall_ctr),
        overallConversionRate: parseFloat(overview.overall_conversion_rate)
      };
    } catch (error) {
      logger.error('Error getting campaigns overview:', error);
      throw error;
    }
  }

  /**
   * Duplicate an existing campaign
   * @param {string} campaignId - Campaign ID to duplicate
   * @param {string} createdBy - User ID creating duplicate
   * @returns {Promise<Object>} - Duplicated campaign
   */
  async duplicateCampaign(campaignId, createdBy) {
    try {
      const original = await this.getCampaignDetails(campaignId);

      if (!original) {
        throw new Error('Campaign not found');
      }

      const duplicateData = {
        name: `${original.name} (Copy)`,
        description: original.description,
        campaignType: original.campaignType,
        placementSlot: original.placementSlot,
        priority: original.priority,
        heroImageUrl: original.heroImageUrl,
        thumbnailUrl: original.thumbnailUrl,
        backgroundColor: original.backgroundColor,
        textColor: original.textColor,
        headline: original.headline,
        subheadline: original.subheadline,
        callToAction: original.callToAction,
        ctaUrl: original.ctaUrl,
        targetAudience: original.targetAudience,
        geographicTargeting: original.geographicTargeting,
        maxImpressionsPerUser: original.maxImpressionsPerUser,
        showToNewUsersOnly: original.showToNewUsersOnly,
        createdBy,
        items: original.items.map(item => ({
          itemId: item.itemId,
          position: item.position,
          customTitle: item.customTitle,
          customDescription: item.customDescription,
          customImageUrl: item.customImageUrl
        })),
        collectionIds: original.collections.map(c => c.id)
      };

      return await this.createCampaign(duplicateData);
    } catch (error) {
      logger.error('Error duplicating campaign:', error);
      throw error;
    }
  }

  /**
   * Create a reusable collection
   * @param {Object} collectionData - Collection configuration
   * @returns {Promise<Object>} - Created collection
   */
  async createCollection(collectionData) {
    try {
      const {
        name,
        description,
        collectionType = 'manual',
        selectionRules = {},
        maxItems = 20,
        createdBy,
        items = []
      } = collectionData;

      const collectionResult = await pool.query(
        `INSERT INTO curated_collections (
          name, description, collection_type, selection_rules, max_items, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [name, description, collectionType, JSON.stringify(selectionRules), maxItems, createdBy]
      );

      const collection = collectionResult.rows[0];

      // Add items if provided
      if (items.length > 0) {
        const itemValues = items.map((item, index) =>
          `('${collection.id}', '${item.itemId}', ${item.position || index})`
        ).join(',');

        await pool.query(
          `INSERT INTO curated_collection_items (collection_id, item_id, position)
          VALUES ${itemValues}`
        );
      }

      logger.info(`Created collection: ${collection.id} - ${name}`);

      return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        collectionType: collection.collection_type,
        selectionRules: collection.selection_rules,
        maxItems: collection.max_items
      };
    } catch (error) {
      logger.error('Error creating collection:', error);
      throw error;
    }
  }
}

module.exports = new CuratedCampaignService();
