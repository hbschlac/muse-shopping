const pool = require('../db/pool');
const PersonalizedRecommendationService = require('./personalizedRecommendationService');
const SponsoredContentService = require('./sponsoredContentService');
const ExperimentService = require('./experimentService');
const StyleProfileService = require('./styleProfileService');

class NewsfeedService {
  /**
   * Get brand stories for user's newsfeed (top carousel)
   * Returns stories from brands the user follows, ranked by 100D profile match
   */
  static async getUserStories(userId) {
    const query = `SELECT * FROM get_user_stories($1)`;
    const result = await pool.query(query, [userId]);

    // Rank stories by 100D profile match
    const rankedStories = await StyleProfileService.rankStoriesForUser(userId, result.rows);
    return rankedStories;
  }

  /**
   * Get story details with all frames
   */
  static async getStoryDetails(storyId, userId = null) {
    // Get story metadata
    const storyQuery = `
      SELECT
        s.id,
        s.brand_id,
        b.name as brand_name,
        b.logo_url as brand_logo,
        s.title,
        s.story_type,
        s.background_color,
        s.text_color,
        s.expires_at,
        s.metadata
      FROM brand_stories s
      JOIN brands b ON s.brand_id = b.id
      WHERE s.id = $1
        AND s.is_active = TRUE
        AND s.starts_at <= CURRENT_TIMESTAMP
        AND s.expires_at > CURRENT_TIMESTAMP
    `;
    const storyResult = await pool.query(storyQuery, [storyId]);

    if (storyResult.rows.length === 0) {
      return null;
    }

    const story = storyResult.rows[0];

    // Get all frames for this story
    const framesQuery = `
      SELECT
        id,
        frame_order,
        image_url,
        caption,
        cta_text,
        cta_url,
        item_ids,
        duration_seconds
      FROM brand_story_frames
      WHERE story_id = $1
      ORDER BY frame_order ASC
    `;
    const framesResult = await pool.query(framesQuery, [storyId]);

    story.frames = framesResult.rows;

    // Check if user has viewed this story
    if (userId) {
      const viewQuery = `
        SELECT viewed_at, frames_viewed, completed
        FROM user_story_views
        WHERE user_id = $1 AND story_id = $2
      `;
      const viewResult = await pool.query(viewQuery, [userId, storyId]);
      story.user_view = viewResult.rows[0] || null;
    }

    return story;
  }

  /**
   * Mark story as viewed by user
   */
  static async markStoryViewed(userId, storyId, framesViewed, completed) {
    const query = `
      INSERT INTO user_story_views (user_id, story_id, frames_viewed, completed)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, story_id)
      DO UPDATE SET
        frames_viewed = GREATEST(user_story_views.frames_viewed, $3),
        completed = user_story_views.completed OR $4,
        viewed_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [userId, storyId, framesViewed, completed]);
    return result.rows[0];
  }

  /**
   * Get personalized feed modules for user
   * Returns time-based content carousels from followed brands, ranked by 100D profile match
   */
  static async getUserFeedModules(userId, limit = 20, offset = 0) {
    const query = `SELECT * FROM get_user_feed_modules($1, $2, $3)`;
    const result = await pool.query(query, [userId, limit, offset]);

    // Boost modules by 100D profile match
    const boostedModules = await StyleProfileService.boostModulesForUser(userId, result.rows);

    // Add Nordstrom products module if user follows brands available on Nordstrom
    const nordstromModule = await this.getNordstromModuleForUser(userId);
    if (nordstromModule && boostedModules.length > 0) {
      // Insert Nordstrom module after first 2 modules
      boostedModules.splice(2, 0, nordstromModule);
    }

    return boostedModules;
  }

  /**
   * Get Nordstrom products module for user's followed brands
   */
  static async getNordstromModuleForUser(userId) {
    const query = `
      SELECT
        i.id,
        i.name,
        i.image_url,
        i.price_cents,
        i.original_price_cents,
        i.product_url,
        b.name as brand_name,
        b.logo_url as brand_logo
      FROM items i
      JOIN brands b ON i.brand_id = b.id
      JOIN user_brand_affinities uba ON uba.brand_id = b.id
      WHERE uba.user_id = $1
        AND i.store_id = 2
        AND i.is_active = true
        AND i.is_available = true
      ORDER BY i.created_at DESC
      LIMIT 12
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      module_id: 'nordstrom-latest',
      title: 'Latest from Nordstrom',
      subtitle: 'New arrivals from brands you follow',
      module_type: 'product_grid',
      layout_type: 'grid',
      brand_name: 'Nordstrom',
      brand_logo: 'https://www.nordstrom.com/logo.png',
      items: result.rows.map(item => ({
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        price: item.price_cents / 100,
        original_price: item.original_price_cents / 100,
        product_url: item.product_url,
        brand_name: item.brand_name,
        brand_logo: item.brand_logo,
        discount_percentage: item.original_price_cents > item.price_cents
          ? Math.round((1 - item.price_cents / item.original_price_cents) * 100)
          : 0
      }))
    };
  }

  /**
   * Get items for a specific feed module
   * Enhanced with personalized scoring for the user
   * Returns module configuration + items for Instagram-style layouts
   */
  static async getModuleItems(moduleId, userId = null) {
    // Fetch module configuration with Instagram-style fields
    const configQuery = `
      SELECT
        m.id as module_id,
        m.brand_id,
        m.title,
        m.subtitle,
        m.module_type,
        m.layout_type,
        m.items_per_view,
        m.aspect_ratio,
        m.hero_image_url,
        m.hero_video_url,
        m.video_poster_url,
        m.hero_source,
        m.background_color,
        m.text_color,
        m.gradient_overlay,
        m.overlay_opacity,
        m.header_cta_text,
        m.show_brand_logo,
        m.show_item_details,
        m.featured_item_id,
        m.display_config,
        b.name as brand_name,
        b.logo_url as brand_logo,
        b.slug as brand_slug,
        -- Auto-generate hero if not manually set
        COALESCE(m.hero_image_url, get_module_hero_image(m.id)) as computed_hero_url
      FROM feed_modules m
      LEFT JOIN brands b ON m.brand_id = b.id
      WHERE m.id = $1
    `;
    const configResult = await pool.query(configQuery, [moduleId]);

    if (configResult.rows.length === 0) {
      return null;
    }

    const config = configResult.rows[0];

    // Get items (personalized if userId provided)
    let items;
    const minItemsPerCarousel = 20; // Minimum items per carousel

    if (userId) {
      items = await PersonalizedRecommendationService.getPersonalizedModuleItems(userId, moduleId);

      // Boost items by 100D profile match
      items = await StyleProfileService.boostItemsForUser(userId, items);
    } else {
      const itemsQuery = `SELECT * FROM get_module_items($1)`;
      const itemsResult = await pool.query(itemsQuery, [moduleId]);
      items = itemsResult.rows;
    }

    // If we don't have enough items, pad with brand's other products
    if (items.length < minItemsPerCarousel && config.brand_id) {
      const paddingQuery = `
        SELECT DISTINCT
          i.id as item_id,
          i.canonical_name,
          i.description,
          i.category,
          i.primary_image_url,
          i.media_type,
          i.video_url,
          i.video_poster_url,
          i.video_duration_seconds,
          i.min_price,
          i.sale_price,
          false as is_featured,
          0 as display_order
        FROM items i
        JOIN item_retailers ir ON i.id = ir.item_id
        JOIN retailers r ON ir.retailer_id = r.id
        WHERE r.brand_id = $1
          AND i.is_active = true
          AND ir.is_available = true
          AND i.id NOT IN (SELECT unnest($2::int[]))
        ORDER BY RANDOM()
        LIMIT $3
      `;
      const existingIds = items.map(item => item.item_id);
      const paddingResult = await pool.query(paddingQuery, [
        config.brand_id,
        existingIds,
        minItemsPerCarousel - items.length
      ]);
      items = [...items, ...paddingResult.rows];
    }

    return {
      config,
      items
    };
  }

  /**
   * Get complete feed (stories + modules + sponsored content) for user
   */
  static async getCompleteFeed(userId, modulesLimit = 20, modulesOffset = 0, userContext = {}) {
    console.log('[NewsfeedService.getCompleteFeed] Called with userId:', userId);

    // Get stories
    const stories = await this.getUserStories(userId);
    console.log('[NewsfeedService.getCompleteFeed] Stories count:', stories.length);

    // Get modules
    const modules = await this.getUserFeedModules(userId, modulesLimit, modulesOffset);
    console.log('[NewsfeedService.getCompleteFeed] Modules from DB:', modules.length);

    // For each module, get its items with personalization and configuration
    const modulesWithItems = await Promise.all(
      modules.map(async (module) => {
        console.log('[NewsfeedService.getCompleteFeed] Processing module:', module.module_id);
        const moduleData = await this.getModuleItems(module.module_id, userId);

        if (!moduleData) {
          console.log('[NewsfeedService.getCompleteFeed] Module data is null for module:', module.module_id);
          return null;
        }
        console.log('[NewsfeedService.getCompleteFeed] Module data retrieved, items count:', moduleData.items?.length);

        // Check for experiment assignment
        const experimentAssignment = await ExperimentService.getModuleExperimentAssignment(
          userId,
          module.module_id
        );

        console.log('[NewsfeedService.getCompleteFeed] Experiment assignment:', experimentAssignment);

        // Track impression if in experiment
        if (experimentAssignment && experimentAssignment.in_experiment) {
          await ExperimentService.trackModuleImpression(
            userId,
            module.module_id,
            experimentAssignment.variant_id,
            { position: modules.indexOf(module) }
          );
        }

        // Merge module metadata with config and items
        return {
          id: moduleData.config.module_id,
          brand_id: moduleData.config.brand_id,
          // Layout configuration
          layout: {
            type: moduleData.config.layout_type || 'carousel',
            items_per_view: moduleData.config.items_per_view || 3,
            aspect_ratio: moduleData.config.aspect_ratio || 'portrait'
          },
          // Hero assets
          hero: {
            image_url: moduleData.config.computed_hero_url,
            video_url: moduleData.config.hero_video_url,
            poster_url: moduleData.config.video_poster_url,
            source: moduleData.config.hero_source || 'auto_generated'
          },
          // Styling
          styling: {
            background_color: moduleData.config.background_color || '#FFFFFF',
            text_color: moduleData.config.text_color || '#000000',
            gradient_overlay: moduleData.config.gradient_overlay,
            overlay_opacity: moduleData.config.overlay_opacity || 0.3
          },
          // Content
          content: {
            title: moduleData.config.title,
            subtitle: moduleData.config.subtitle,
            cta_text: moduleData.config.header_cta_text,
            show_brand_logo: moduleData.config.show_brand_logo !== false,
            show_item_details: moduleData.config.show_item_details !== false
          },
          // Brand info
          brand: {
            id: moduleData.config.brand_id,
            name: moduleData.config.brand_name,
            logo_url: moduleData.config.brand_logo,
            slug: moduleData.config.brand_slug
          },
          // Items
          products: moduleData.items,
          featured_item_id: moduleData.config.featured_item_id,
          display_config: moduleData.config.display_config || {},
          // Legacy fields for compatibility
          module_type: moduleData.config.module_type,
          item_count: moduleData.items.length,
          // Experiment data (if applicable)
          experiment: experimentAssignment ? {
            experiment_id: experimentAssignment.experiment_id,
            variant_id: experimentAssignment.variant_id,
            variant_name: experimentAssignment.variant_name,
            in_experiment: experimentAssignment.in_experiment
          } : null
        };
      })
    );

    // Filter out null modules
    const validModules = modulesWithItems.filter(m => m !== null);
    console.log('[NewsfeedService.getCompleteFeed] Valid modules after filtering:', validModules.length);

    // Get sponsored content for homepage
    let sponsoredContent = null;
    if (modulesOffset === 0) {
      // Only show sponsored content on first page
      const eligibleCampaigns = await SponsoredContentService.getEligibleCampaigns(
        userId,
        'homepage_hero',
        userContext
      );

      if (eligibleCampaigns.length > 0) {
        sponsoredContent = eligibleCampaigns[0]; // Show top priority campaign
      }
    }

    // Insert sponsored modules at specific positions
    const feedWithSponsored = await this.insertSponsoredModules(
      validModules,
      userId,
      userContext
    );

    return {
      stories,
      sponsored_hero: sponsoredContent, // Hero banner at top
      modules: feedWithSponsored,
      pagination: {
        limit: modulesLimit,
        offset: modulesOffset,
        has_more: modules.length === modulesLimit
      }
    };
  }

  /**
   * Insert sponsored content modules at specific positions in feed
   */
  static async insertSponsoredModules(modules, userId, userContext) {
    // Get sponsored content for newsfeed positions
    const sponsoredPosition3 = await SponsoredContentService.getEligibleCampaigns(
      userId,
      'newsfeed_position_3',
      userContext
    );

    const sponsoredPosition8 = await SponsoredContentService.getEligibleCampaigns(
      userId,
      'newsfeed_position_8',
      userContext
    );

    const result = [...modules];

    // Insert sponsored content at position 3 (if exists)
    if (sponsoredPosition3.length > 0 && result.length >= 3) {
      result.splice(2, 0, {
        type: 'sponsored',
        campaign: sponsoredPosition3[0],
        position_index: 3
      });
    }

    // Insert sponsored content at position 8 (if exists)
    if (sponsoredPosition8.length > 0 && result.length >= 8) {
      result.splice(7, 0, {
        type: 'sponsored',
        campaign: sponsoredPosition8[0],
        position_index: 8
      });
    }

    return result;
  }

  /**
   * Track user interaction with a module
   */
  static async trackModuleInteraction(userId, moduleId, interactionType, itemId = null) {
    const query = `
      INSERT INTO user_module_interactions (user_id, module_id, interaction_type, item_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, moduleId, interactionType, itemId]);
    return result.rows[0];
  }

  /**
   * Get module analytics for a brand
   */
  static async getModuleAnalytics(moduleId) {
    const query = `
      SELECT
        interaction_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_module_interactions
      WHERE module_id = $1
      GROUP BY interaction_type
    `;
    const result = await pool.query(query, [moduleId]);

    const analytics = {
      module_id: moduleId,
      interactions: {}
    };

    result.rows.forEach(row => {
      analytics.interactions[row.interaction_type] = {
        count: parseInt(row.count),
        unique_users: parseInt(row.unique_users)
      };
    });

    return analytics;
  }

  /**
   * Get story analytics
   */
  static async getStoryAnalytics(storyId) {
    const query = `
      SELECT
        COUNT(*) as total_views,
        COUNT(DISTINCT user_id) as unique_viewers,
        COUNT(*) FILTER (WHERE completed = true) as completed_views,
        AVG(frames_viewed) as avg_frames_viewed
      FROM user_story_views
      WHERE story_id = $1
    `;
    const result = await pool.query(query, [storyId]);

    return {
      story_id: storyId,
      total_views: parseInt(result.rows[0].total_views),
      unique_viewers: parseInt(result.rows[0].unique_viewers),
      completed_views: parseInt(result.rows[0].completed_views),
      avg_frames_viewed: parseFloat(result.rows[0].avg_frames_viewed) || 0,
      completion_rate: result.rows[0].total_views > 0
        ? (result.rows[0].completed_views / result.rows[0].total_views * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Get public brand modules for non-authenticated users
   * Returns diverse selection of brands with products, rotated randomly
   */
  static async getPublicBrandModules(limit = 20, offset = 0) {
    try {
      // Get brands with sufficient products (at least 10 items)
      // Prioritize our featured retailers, then randomize the rest for variety
      const brandsQuery = `
        WITH brand_product_counts AS (
          SELECT
            b.id,
            b.name,
            b.slug,
            b.logo_url,
            COUNT(i.id) as product_count,
            CASE
              WHEN b.name IN ('The Commense', 'Sunfere', 'Shop Cider') THEN 1
              WHEN b.name IN ('Nordstrom', 'Target', 'ZARA', 'H&M', 'Urban Outfitters', 'Free People') THEN 2
              ELSE 3
            END as priority
          FROM brands b
          INNER JOIN items i ON b.id = i.brand_id AND i.is_active = TRUE
          WHERE b.is_active = TRUE
          GROUP BY b.id, b.name, b.slug, b.logo_url
          HAVING COUNT(i.id) >= 10
        )
        SELECT id, name, slug, logo_url, product_count
        FROM brand_product_counts
        ORDER BY priority ASC, RANDOM()
        LIMIT $1 OFFSET $2
      `;

      const brandsResult = await pool.query(brandsQuery, [limit, offset]);
      const brands = brandsResult.rows;

      // For each brand, get recent products
      const modules = await Promise.all(brands.map(async (brand) => {
        const itemsQuery = `
          SELECT
            i.id,
            i.canonical_name as name,
            i.primary_image_url as image_url,
            COALESCE(MIN(il.price), i.price_cents / 100.0) as price,
            COALESCE(MIN(il.sale_price), i.original_price_cents / 100.0) as original_price
          FROM items i
          LEFT JOIN item_listings il ON i.id = il.item_id
          WHERE i.brand_id = $1 AND i.is_active = TRUE
          GROUP BY i.id
          ORDER BY i.created_at DESC
          LIMIT 24
        `;

        const itemsResult = await pool.query(itemsQuery, [brand.id]);

        return {
          id: `public-${brand.id}`,
          brand: {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            logo_url: brand.logo_url,
            is_active: true
          },
          products: itemsResult.rows.map(item => ({
            id: item.id,
            name: item.name,
            image_url: item.image_url,
            price: parseFloat(item.price),
            original_price: item.original_price ? parseFloat(item.original_price) : null,
            brand_name: brand.name
          })),
          is_favorite: false
        };
      }));

      return modules.filter(m => m.products.length > 0);
    } catch (error) {
      console.error('[NewsfeedService.getPublicBrandModules] Error:', error);
      return [];
    }
  }
}

module.exports = NewsfeedService;
