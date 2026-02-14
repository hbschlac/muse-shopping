const NewsfeedService = require('../services/newsfeedService');

class NewsfeedController {
  /**
   * GET /api/v1/newsfeed
   * Get complete personalized newsfeed (stories + modules)
   * Supports both authenticated and unauthenticated access
   */
  static async getFeed(req, res, next) {
    try {
      const userId = req.userId; // May be undefined for unauthenticated requests
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      // If no userId, return public feed content with sample brand modules
      if (!userId) {
        const stories = await NewsfeedService.getUserStories(null);
        const sampleModules = await NewsfeedService.getPublicBrandModules(limit, offset);

        const defaultFeed = {
          hero_campaigns: [],
          stories: stories || [],
          brand_modules: sampleModules || []
        };

        return res.json({
          success: true,
          data: defaultFeed
        });
      }

      const feed = await NewsfeedService.getCompleteFeed(userId, limit, offset);

      // Map to expected frontend structure
      res.json({
        success: true,
        data: {
          hero_campaigns: feed.sponsored_hero ? [feed.sponsored_hero] : [],
          stories: feed.stories || [],
          brand_modules: feed.modules || []
        }
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

  /**
   * GET /api/v1/newsfeed/demo
   * Get demo feed with sample Instagram-style modules
   */
  static async getDemoFeed(req, res, next) {
    try {
      const demoFeed = {
        hero_campaigns: [],
        stories: [],
        brand_modules: [
          {
            id: 'demo-1',
            brand_id: 1,
            layout: {
              type: 'hero_carousel',
              items_per_view: 3,
              aspect_ratio: 'portrait'
            },
            hero: {
              image_url: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
              video_url: null,
              poster_url: null,
              source: 'manual'
            },
            styling: {
              background_color: '#1a1a1a',
              text_color: '#ffffff',
              gradient_overlay: 'from-black/60 to-transparent',
              overlay_opacity: 0.4
            },
            content: {
              title: 'New Spring Collection',
              subtitle: 'Fresh styles for the season',
              cta_text: 'Shop Now',
              show_brand_logo: true,
              show_item_details: true
            },
            brand: {
              id: 1,
              name: 'Nordstrom Rack',
              logo_url: 'https://www.nordstromrack.com/logos/mobile-logo.svg',
              slug: 'nordstrom-rack'
            },
            products: [
              {
                id: 1,
                name: 'Floral Print Midi Dress',
                image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600',
                media_type: 'image',
                price_cents: 8999,
                original_price_cents: 12999,
                brand_name: 'Nordstrom Rack'
              },
              {
                id: 2,
                name: 'Linen Blend Blazer',
                image_url: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600',
                media_type: 'image',
                price_cents: 11999,
                brand_name: 'Nordstrom Rack'
              },
              {
                id: 3,
                name: 'Wide Leg Trousers',
                image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600',
                media_type: 'image',
                price_cents: 6999,
                original_price_cents: 9999,
                brand_name: 'Nordstrom Rack'
              },
              {
                id: 4,
                name: 'Leather Crossbody Bag',
                image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600',
                media_type: 'image',
                price_cents: 14999,
                brand_name: 'Nordstrom Rack'
              }
            ],
            featured_item_id: null,
            display_config: {},
            module_type: 'brand_module',
            item_count: 4
          },
          {
            id: 'demo-2',
            brand_id: 2,
            layout: {
              type: 'featured_grid',
              items_per_view: 4,
              aspect_ratio: 'portrait'
            },
            hero: {
              image_url: null,
              video_url: null,
              poster_url: null,
              source: 'auto_generated'
            },
            styling: {
              background_color: '#f5f5f5',
              text_color: '#2c2c2c',
              gradient_overlay: null,
              overlay_opacity: 0.3
            },
            content: {
              title: 'Sustainable Essentials',
              subtitle: 'Eco-friendly wardrobe staples',
              cta_text: null,
              show_brand_logo: true,
              show_item_details: true
            },
            brand: {
              id: 2,
              name: 'Reformation',
              logo_url: 'https://www.thereformation.com/on/demandware.static/-/Library-Sites-REFSharedLibrary/default/dw9a4b8c7e/images/logos/ref-logo.svg',
              slug: 'reformation'
            },
            products: [
              {
                id: 101,
                name: 'Organic Cotton Tee',
                image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
                media_type: 'image',
                price_cents: 3800,
                brand_name: 'Reformation'
              },
              {
                id: 102,
                name: 'Recycled Denim Jeans',
                image_url: 'https://images.unsplash.com/photo-1542272454315-7bfb2c3f45e8?w=600',
                media_type: 'image',
                price_cents: 9800,
                brand_name: 'Reformation'
              },
              {
                id: 103,
                name: 'Linen Shirt Dress',
                image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
                media_type: 'image',
                price_cents: 12800,
                brand_name: 'Reformation'
              },
              {
                id: 104,
                name: 'Canvas Tote Bag',
                image_url: 'https://images.unsplash.com/photo-1590393876866-0102587b0657?w=600',
                media_type: 'image',
                price_cents: 4500,
                brand_name: 'Reformation'
              },
              {
                id: 105,
                name: 'Bamboo Tank Top',
                image_url: 'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=600',
                media_type: 'image',
                price_cents: 2800,
                brand_name: 'Reformation'
              },
              {
                id: 106,
                name: 'Hemp Blend Sweater',
                image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600',
                media_type: 'image',
                price_cents: 8900,
                original_price_cents: 11900,
                brand_name: 'Reformation'
              },
              {
                id: 107,
                name: 'Tencel Midi Skirt',
                image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600',
                media_type: 'image',
                price_cents: 7800,
                brand_name: 'Reformation'
              }
            ],
            featured_item_id: 101,
            display_config: {},
            module_type: 'brand_module',
            item_count: 7
          }
        ]
      };

      res.json({
        success: true,
        data: demoFeed
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NewsfeedController;
