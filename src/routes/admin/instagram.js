/**
 * Admin Instagram Analysis Routes
 * Endpoints for managing Instagram analysis and influencer database
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const pool = require('../../db/pool');
const InstagramDataService = require('../../services/instagramDataService');
const InfluencerAnalysisService = require('../../services/influencerAnalysisService');
const InstagramStyleProfilingService = require('../../services/instagramStyleProfilingService');
const InstagramEnhancedRecommendationService = require('../../services/instagramEnhancedRecommendationService');

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * POST /admin/instagram/analyze-user
 * Trigger Instagram analysis for a user
 */
router.post('/analyze-user', async (req, res) => {
  try {
    const { userId, influencerUsernames } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Check if user has Instagram connected
    const connectionResult = await pool.query(
      'SELECT id FROM social_connections WHERE user_id = $1 AND provider = $2 AND is_active = true',
      [userId, 'instagram']
    );

    if (connectionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User does not have Instagram connected'
      });
    }

    // Start analysis
    const results = await InstagramStyleProfilingService.analyzeUserInstagram(
      userId,
      influencerUsernames || []
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/instagram/analyze-influencer
 * Analyze a single influencer and add to database
 */
router.post('/analyze-influencer', async (req, res) => {
  try {
    const { username, profile, posts } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'username is required'
      });
    }

    // Check if influencer already exists
    const existing = await InfluencerAnalysisService.getInfluencerByUsername(username);

    if (existing) {
      return res.json({
        success: true,
        data: {
          influencer: existing,
          message: 'Influencer already exists in database'
        }
      });
    }

    if (!profile || !posts) {
      return res.status(400).json({
        success: false,
        error: 'profile and posts data required for new influencer'
      });
    }

    // Create influencer profile from analysis
    const influencerProfile = InfluencerAnalysisService.createInfluencerProfile(profile, posts);

    // Save to database
    const savedInfluencer = await InfluencerAnalysisService.saveInfluencer(influencerProfile);

    res.json({
      success: true,
      data: {
        influencer: savedInfluencer,
        message: 'Influencer analyzed and saved'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/instagram/build-style-profile
 * Build or rebuild style profile for a user
 */
router.post('/build-style-profile', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const styleProfile = await InstagramStyleProfilingService.buildStyleProfile(userId);

    if (!styleProfile) {
      return res.json({
        success: false,
        message: 'No influencers found for user. User must follow fashion influencers first.'
      });
    }

    res.json({
      success: true,
      data: styleProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/instagram/influencers
 * List all fashion influencers in database
 */
router.get('/influencers', async (req, res) => {
  try {
    const { tier, minConfidence, limit } = req.query;

    const filters = {
      tier,
      minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
      limit: limit ? parseInt(limit) : 50
    };

    const influencers = await InfluencerAnalysisService.getInfluencers(filters);

    res.json({
      success: true,
      data: {
        influencers,
        count: influencers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/instagram/user-insights/:userId
 * Get Instagram insights for a specific user
 */
router.get('/user-insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const insights = await InstagramStyleProfilingService.getStyleInsights(parseInt(userId));

    if (!insights) {
      return res.status(404).json({
        success: false,
        error: 'No Instagram insights found for this user'
      });
    }

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/instagram/user-influencers/:userId
 * Get influencers followed by a user
 */
router.get('/user-influencers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const influencers = await InstagramStyleProfilingService.getUserInfluencers(parseInt(userId));

    res.json({
      success: true,
      data: {
        influencers,
        count: influencers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/instagram/recommendations/test
 * Test Instagram-enhanced recommendations for a user
 */
router.get('/recommendations/test', async (req, res) => {
  try {
    const { userId, limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
    }

    // Get recommendation stats
    const stats = await InstagramEnhancedRecommendationService.getRecommendationStats(
      parseInt(userId)
    );

    // Get enhanced recommendations
    const recommendations = await InstagramEnhancedRecommendationService.getEnhancedPersonalizedItems(
      parseInt(userId),
      { limit: parseInt(limit) || 20 }
    );

    res.json({
      success: true,
      data: {
        stats,
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/instagram/link-user-influencer
 * Manually link a user to an influencer
 */
router.post('/link-user-influencer', async (req, res) => {
  try {
    const { userId, influencerUsername, influenceWeight } = req.body;

    if (!userId || !influencerUsername) {
      return res.status(400).json({
        success: false,
        error: 'userId and influencerUsername are required'
      });
    }

    // Get influencer
    const influencer = await InfluencerAnalysisService.getInfluencerByUsername(influencerUsername);

    if (!influencer) {
      return res.status(404).json({
        success: false,
        error: `Influencer @${influencerUsername} not found in database`
      });
    }

    // Link user to influencer
    const link = await InstagramStyleProfilingService.linkUserToInfluencer(
      userId,
      influencer.id,
      influenceWeight || 1.0
    );

    res.json({
      success: true,
      data: {
        link,
        influencer,
        message: `User ${userId} linked to @${influencerUsername}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/instagram/stats
 * Get overall Instagram analysis statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get influencer stats
    const influencerStats = await pool.query(`
      SELECT
        COUNT(*) as total_influencers,
        COUNT(*) FILTER (WHERE is_fashion_influencer = true) as fashion_influencers,
        COUNT(DISTINCT influencer_tier) as unique_tiers,
        AVG(confidence_score) as avg_confidence_score,
        AVG(follower_count) as avg_follower_count,
        SUM(posts_analyzed) as total_posts_analyzed
      FROM fashion_influencers
    `);

    // Get user insights stats
    const userInsightsStats = await pool.query(`
      SELECT
        COUNT(*) as users_with_insights,
        COUNT(*) FILTER (WHERE sync_status = 'completed') as completed_syncs,
        COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_syncs,
        AVG(overall_confidence) as avg_overall_confidence,
        AVG(fashion_influencers_followed) as avg_influencers_per_user
      FROM instagram_style_insights
    `);

    // Get follow stats
    const followStats = await pool.query(`
      SELECT
        COUNT(*) as total_follows,
        COUNT(DISTINCT user_id) as users_following_influencers,
        AVG(influence_weight) as avg_influence_weight
      FROM user_instagram_follows
    `);

    // Get sync job stats
    const jobStats = await pool.query(`
      SELECT
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
        AVG(influencers_analyzed) as avg_influencers_per_job
      FROM instagram_sync_jobs
    `);

    res.json({
      success: true,
      data: {
        influencers: influencerStats.rows[0],
        user_insights: userInsightsStats.rows[0],
        follows: followStats.rows[0],
        sync_jobs: jobStats.rows[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/instagram/seed-influencers
 * Seed database with known fashion influencers (mock data for testing)
 */
router.post('/seed-influencers', async (req, res) => {
  try {
    const { influencers } = req.body;

    if (!influencers || !Array.isArray(influencers)) {
      return res.status(400).json({
        success: false,
        error: 'influencers array is required'
      });
    }

    const savedInfluencers = [];

    for (const inf of influencers) {
      try {
        const saved = await InfluencerAnalysisService.saveInfluencer(inf);
        savedInfluencers.push(saved);
      } catch (error) {
        console.error(`Error saving influencer @${inf.username}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        influencers: savedInfluencers,
        count: savedInfluencers.length,
        message: `Seeded ${savedInfluencers.length} influencers`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
