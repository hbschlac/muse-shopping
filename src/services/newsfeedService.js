const pool = require('../db/pool');
const PersonalizedRecommendationService = require('./personalizedRecommendationService');
const SponsoredContentService = require('./sponsoredContentService');

class NewsfeedService {
  /**
   * Get brand stories for user's newsfeed (top carousel)
   * Returns stories from brands the user follows
   */
  static async getUserStories(userId) {
    const query = `SELECT * FROM get_user_stories($1)`;
    const result = await pool.query(query, [userId]);
    return result.rows;
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
   * Returns time-based content carousels from followed brands
   */
  static async getUserFeedModules(userId, limit = 20, offset = 0) {
    const query = `SELECT * FROM get_user_feed_modules($1, $2, $3)`;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get items for a specific feed module
   * Enhanced with personalized scoring for the user
   */
  static async getModuleItems(moduleId, userId = null) {
    // If userId provided, use personalized recommendations
    if (userId) {
      return await PersonalizedRecommendationService.getPersonalizedModuleItems(userId, moduleId);
    }

    // Fallback to basic query
    const query = `SELECT * FROM get_module_items($1)`;
    const result = await pool.query(query, [moduleId]);
    return result.rows;
  }

  /**
   * Get complete feed (stories + modules + sponsored content) for user
   */
  static async getCompleteFeed(userId, modulesLimit = 20, modulesOffset = 0, userContext = {}) {
    // Get stories
    const stories = await this.getUserStories(userId);

    // Get modules
    const modules = await this.getUserFeedModules(userId, modulesLimit, modulesOffset);

    // For each module, get its items with personalization
    const modulesWithItems = await Promise.all(
      modules.map(async (module) => {
        const items = await this.getModuleItems(module.module_id, userId);
        return {
          ...module,
          items
        };
      })
    );

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
      modulesWithItems,
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
}

module.exports = NewsfeedService;
