const db = require('../db/pool');
const logger = require('../config/logger');

class CampaignService {
  /**
   * Get campaign details with items
   */
  async getCampaignDetails(campaignId, userId = null) {
    try {
      // Demo mode - if campaignId is 'demo', return a demo campaign
      if (campaignId === 'demo' || campaignId === 'winter-collection' || campaignId === 'spring-essentials') {
        const demoTitles = {
          'demo': 'Featured Collection',
          'winter-collection': 'Winter Collection 2024',
          'spring-essentials': 'Spring Essentials'
        };

        const demoItems = await db.query(
          `
          SELECT
            i.id,
            i.name,
            COALESCE(i.price_cents / 100.0, 99.99) as price,
            CASE
              WHEN i.original_price_cents > i.price_cents
              THEN i.original_price_cents / 100.0
              ELSE NULL
            END as sale_price,
            i.image_url,
            b.name as brand_name,
            ARRAY[]::text[] as categories
          FROM items i
          LEFT JOIN brands b ON b.id = i.brand_id
          WHERE i.is_active = true
            AND i.image_url IS NOT NULL
          ORDER BY RANDOM()
          LIMIT 6
          `
        );

        // Different gradients and optional video for each demo campaign
        const campaignAssets = {
          'demo': {
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            video_url: null,
          },
          'winter-collection': {
            gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
            video_url: 'https://cdn.coverr.co/videos/coverr-winter-fashion-1578995488913-c0e8f3f52a82?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6Ijg3NjdFMzIzRjlGQzEzN0E4QTAyIiwiaWF0IjoxNjQxNDc5MzI5fQ.l3Z0Z6Y_Z_Z0Z6Y_Z', // Optional: add real video URL
          },
          'spring-essentials': {
            gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            video_url: null,
          }
        };

        const assets = campaignAssets[campaignId] || campaignAssets['demo'];

        return {
          id: campaignId,
          title: demoTitles[campaignId] || 'Featured Collection',
          subtitle: 'Curated picks just for you',
          image_url: null,
          video_url: assets.video_url,
          gradient: assets.gradient,
          items: demoItems.rows.map((item) => ({
            id: item.id,
            name: item.name,
            brand_name: item.brand_name,
            price: parseFloat(item.price),
            sale_price: item.sale_price ? parseFloat(item.sale_price) : null,
            image_url: item.image_url,
            categories: item.categories || [],
          })),
        };
      }

      // First check if it's a curated campaign
      const curatedCampaign = await db.query(
        `
        SELECT
          cc.id,
          cc.headline as title,
          cc.subheadline as subtitle,
          cc.hero_image_url as image_url,
          cc.background_color as gradient,
          cc.campaign_type,
          cc.starts_at,
          cc.ends_at
        FROM curated_campaigns cc
        WHERE cc.id = $1
          AND cc.is_active = true
          AND (cc.starts_at IS NULL OR cc.starts_at <= NOW())
          AND (cc.ends_at IS NULL OR cc.ends_at >= NOW())
        `,
        [campaignId]
      );

      let campaign = null;
      let items = [];

      if (curatedCampaign.rows.length > 0) {
        campaign = curatedCampaign.rows[0];

        // Get items for curated campaign
        const campaignItems = await db.query(
          `
          SELECT
            i.id,
            i.name,
            i.price,
            i.sale_price,
            i.image_url,
            b.name as brand_name,
            ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories
          FROM curated_campaign_items cci
          JOIN items i ON i.id = cci.item_id
          LEFT JOIN brands b ON b.id = i.brand_id
          LEFT JOIN item_categories ic ON ic.item_id = i.id
          LEFT JOIN categories c ON c.id = ic.category_id
          WHERE cci.campaign_id = $1
            AND cci.is_active = true
            AND i.is_active = true
          GROUP BY i.id, i.name, i.price, i.sale_price, i.image_url, b.name
          ORDER BY cci.display_order ASC, i.created_at DESC
          LIMIT 6
          `,
          [campaignId]
        );

        items = campaignItems.rows;
      } else {
        // Check if it's a sponsored campaign
        const sponsoredCampaign = await db.query(
          `
          SELECT
            sc.id,
            sc.title,
            sc.subtitle,
            sc.hero_image_url as image_url,
            sc.landing_page_type,
            sc.landing_page_config,
            sc.status
          FROM sponsored_campaigns sc
          WHERE sc.id = $1
            AND sc.status = 'active'
            AND (sc.start_date IS NULL OR sc.start_date <= NOW())
            AND (sc.end_date IS NULL OR sc.end_date >= NOW())
          `,
          [campaignId]
        );

        if (sponsoredCampaign.rows.length > 0) {
          campaign = sponsoredCampaign.rows[0];

          // Get items based on landing_page_config
          const config = campaign.landing_page_config || {};

          if (config.product_ids && config.product_ids.length > 0) {
            // Fetch specific products
            const campaignItems = await db.query(
              `
              SELECT
                i.id,
                i.name,
                i.price,
                i.sale_price,
                i.image_url,
                b.name as brand_name,
                ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories
              FROM items i
              LEFT JOIN brands b ON b.id = i.brand_id
              LEFT JOIN item_categories ic ON ic.item_id = i.id
              LEFT JOIN categories c ON c.id = ic.category_id
              WHERE i.id = ANY($1::uuid[])
                AND i.is_active = true
              GROUP BY i.id, i.name, i.price, i.sale_price, i.image_url, b.name
              LIMIT 6
              `,
              [config.product_ids]
            );

            items = campaignItems.rows;
          } else if (config.brand_id) {
            // Fetch brand's products
            const campaignItems = await db.query(
              `
              SELECT
                i.id,
                i.name,
                i.price,
                i.sale_price,
                i.image_url,
                b.name as brand_name,
                ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories
              FROM items i
              LEFT JOIN brands b ON b.id = i.brand_id
              LEFT JOIN item_categories ic ON ic.item_id = i.id
              LEFT JOIN categories c ON c.id = ic.category_id
              WHERE i.brand_id = $1
                AND i.is_active = true
              GROUP BY i.id, i.name, i.price, i.sale_price, i.image_url, b.name
              ORDER BY i.created_at DESC
              LIMIT 6
              `,
              [config.brand_id]
            );

            items = campaignItems.rows;
          } else if (config.category) {
            // Fetch category products
            const campaignItems = await db.query(
              `
              SELECT
                i.id,
                i.name,
                i.price,
                i.sale_price,
                i.image_url,
                b.name as brand_name,
                ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories
              FROM items i
              LEFT JOIN brands b ON b.id = i.brand_id
              LEFT JOIN item_categories ic ON ic.item_id = i.id
              LEFT JOIN categories c ON c.id = ic.category_id
              WHERE c.name ILIKE $1
                AND i.is_active = true
              GROUP BY i.id, i.name, i.price, i.sale_price, i.image_url, b.name
              ORDER BY i.created_at DESC
              LIMIT 6
              `,
              [`%${config.category}%`]
            );

            items = campaignItems.rows;
          }
        }
      }

      if (!campaign) {
        return null;
      }

      return {
        id: campaign.id,
        title: campaign.title,
        subtitle: campaign.subtitle || '',
        image_url: campaign.image_url || null,
        gradient: campaign.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          brand_name: item.brand_name,
          price: parseFloat(item.price),
          sale_price: item.sale_price ? parseFloat(item.sale_price) : null,
          image_url: item.image_url,
          categories: item.categories || [],
        })),
      };
    } catch (error) {
      logger.error('Error getting campaign details:', error);
      throw error;
    }
  }

  /**
   * Track campaign impression
   */
  async trackImpression(campaignId, userId = null) {
    try {
      // Try curated campaign first
      const curatedResult = await db.query(
        `
        INSERT INTO curated_campaign_impressions (campaign_id, user_id, viewed_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
        `,
        [campaignId, userId]
      );

      if (curatedResult.rows.length === 0) {
        // Try sponsored campaign
        await db.query(
          `
          INSERT INTO sponsored_impressions (campaign_id, user_id, viewed_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT DO NOTHING
          `,
          [campaignId, userId]
        );
      }
    } catch (error) {
      logger.error('Error tracking campaign impression:', error);
      // Don't throw - tracking failures shouldn't break the user experience
    }
  }

  /**
   * Track campaign click
   */
  async trackClick(campaignId, userId = null, clickType = 'item_card') {
    try {
      // Try curated campaign first
      const curatedResult = await db.query(
        `
        INSERT INTO curated_campaign_clicks (campaign_id, user_id, click_type, clicked_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
        `,
        [campaignId, userId, clickType]
      );

      if (curatedResult.rows.length === 0) {
        // Try sponsored campaign
        await db.query(
          `
          INSERT INTO sponsored_clicks (campaign_id, user_id, click_type, clicked_at)
          VALUES ($1, $2, $3, NOW())
          `,
          [campaignId, userId, clickType]
        );
      }
    } catch (error) {
      logger.error('Error tracking campaign click:', error);
      // Don't throw - tracking failures shouldn't break the user experience
    }
  }

  /**
   * Track campaign conversion
   */
  async trackConversion(campaignId, userId = null, itemId, conversionType) {
    try {
      // Try curated campaign first
      const curatedResult = await db.query(
        `
        INSERT INTO curated_campaign_conversions
          (campaign_id, user_id, item_id, conversion_type, converted_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
        `,
        [campaignId, userId, itemId, conversionType]
      );

      if (curatedResult.rows.length === 0) {
        // Try sponsored campaign
        await db.query(
          `
          INSERT INTO sponsored_conversions
            (campaign_id, user_id, item_id, conversion_type, converted_at)
          VALUES ($1, $2, $3, $4, NOW())
          `,
          [campaignId, userId, itemId, conversionType]
        );
      }
    } catch (error) {
      logger.error('Error tracking campaign conversion:', error);
      // Don't throw - tracking failures shouldn't break the user experience
    }
  }
}

module.exports = new CampaignService();
