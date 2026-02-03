const NewsfeedService = require('../services/newsfeedService');

class NewsfeedController {
  /**
   * GET /api/v1/newsfeed
   * Get complete personalized newsfeed (stories + modules)
   */
  static async getFeed(req, res, next) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const feed = await NewsfeedService.getCompleteFeed(userId, limit, offset);

      res.json({
        success: true,
        data: feed
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/newsfeed/stories
   * Get brand stories for top carousel
   */
  static async getStories(req, res, next) {
    try {
      const userId = req.userId;
      const stories = await NewsfeedService.getUserStories(userId);

      res.json({
        success: true,
        data: { stories }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/newsfeed/stories/:storyId
   * Get detailed story with all frames
   */
  static async getStoryDetails(req, res, next) {
    try {
      const userId = req.userId;
      const { storyId } = req.params;

      const story = await NewsfeedService.getStoryDetails(storyId, userId);

      if (!story) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Story not found or expired'
          }
        });
      }

      res.json({
        success: true,
        data: story
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/newsfeed/stories/:storyId/view
   * Mark story as viewed
   */
  static async markStoryViewed(req, res, next) {
    try {
      const userId = req.userId;
      const { storyId } = req.params;
      const { frames_viewed = 0, completed = false } = req.body;

      const view = await NewsfeedService.markStoryViewed(
        userId,
        storyId,
        frames_viewed,
        completed
      );

      res.json({
        success: true,
        data: view
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/newsfeed/modules
   * Get feed modules (carousels)
   */
  static async getModules(req, res, next) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const modules = await NewsfeedService.getUserFeedModules(userId, limit, offset);

      res.json({
        success: true,
        data: {
          modules,
          pagination: {
            limit,
            offset,
            has_more: modules.length === limit
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/newsfeed/modules/:moduleId/items
   * Get items in a specific module carousel (personalized for user)
   */
  static async getModuleItems(req, res, next) {
    try {
      const userId = req.userId;
      const { moduleId } = req.params;
      const items = await NewsfeedService.getModuleItems(moduleId, userId);

      res.json({
        success: true,
        data: { items }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/newsfeed/modules/:moduleId/interact
   * Track user interaction with module (view, swipe, click)
   */
  static async trackModuleInteraction(req, res, next) {
    try {
      const userId = req.userId;
      const { moduleId } = req.params;
      const { interaction_type, item_id = null } = req.body;

      // Validate interaction type
      const validTypes = ['view', 'swipe', 'item_click', 'dismiss'];
      if (!validTypes.includes(interaction_type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid interaction_type. Must be one of: view, swipe, item_click, dismiss'
          }
        });
      }

      const interaction = await NewsfeedService.trackModuleInteraction(
        userId,
        moduleId,
        interaction_type,
        item_id
      );

      res.json({
        success: true,
        data: interaction
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/newsfeed/modules/:moduleId/analytics
   * Get analytics for a module (for brand dashboard)
   */
  static async getModuleAnalytics(req, res, next) {
    try {
      const { moduleId } = req.params;
      const analytics = await NewsfeedService.getModuleAnalytics(moduleId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/newsfeed/stories/:storyId/analytics
   * Get analytics for a story
   */
  static async getStoryAnalytics(req, res, next) {
    try {
      const { storyId } = req.params;
      const analytics = await NewsfeedService.getStoryAnalytics(storyId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NewsfeedController;
