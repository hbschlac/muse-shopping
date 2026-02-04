/**
 * Influencer Controller
 * Handles influencer browsing and follow actions
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const StyleProfileService = require('../services/styleProfileService');

class InfluencerController {
  /**
   * GET /api/v1/influencers
   * Browse fashion influencers with optional filters
   */
  static async getInfluencers(req, res) {
    try {
      const {
        style_archetype,
        price_tier,
        category_focus,
        limit = 20,
        offset = 0,
      } = req.query;

      let query = `
        SELECT
          id,
          display_name,
          username,
          profile_picture_url,
          follower_count,
          style_archetype,
          price_tier,
          category_focus,
          commerce_readiness_score,
          audience_life_stage
        FROM fashion_influencers
        WHERE is_fashion_influencer = true
      `;

      const params = [];
      let paramIndex = 1;

      if (style_archetype) {
        query += ` AND style_archetype = $${paramIndex}`;
        params.push(style_archetype);
        paramIndex++;
      }

      if (price_tier) {
        query += ` AND price_tier = $${paramIndex}`;
        params.push(price_tier);
        paramIndex++;
      }

      if (category_focus) {
        query += ` AND category_focus = $${paramIndex}`;
        params.push(category_focus);
        paramIndex++;
      }

      query += ` ORDER BY follower_count DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);

      res.json({
        influencers: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: result.rows.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching influencers:', error);
      res.status(500).json({ error: 'Failed to fetch influencers' });
    }
  }

  /**
   * GET /api/v1/influencers/:id
   * Get single influencer details
   */
  static async getInfluencer(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT
          id,
          display_name,
          username,
          profile_picture_url,
          follower_count,
          biography,
          style_archetype,
          price_tier,
          category_focus,
          commerce_readiness_score,
          audience_life_stage,
          aesthetic_tags,
          brand_affiliations
         FROM fashion_influencers
         WHERE id = $1 AND is_fashion_influencer = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Influencer not found' });
      }

      res.json({ influencer: result.rows[0] });
    } catch (error) {
      logger.error('Error fetching influencer:', error);
      res.status(500).json({ error: 'Failed to fetch influencer' });
    }
  }

  /**
   * POST /api/v1/influencers/:id/follow
   * Follow an influencer and update style profile
   */
  static async followInfluencer(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Check if influencer exists
      const influencerResult = await pool.query(
        `SELECT * FROM fashion_influencers WHERE id = $1 AND is_fashion_influencer = true`,
        [id]
      );

      if (influencerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Influencer not found' });
      }

      const influencer = influencerResult.rows[0];

      // Create follow relationship
      await pool.query(
        `INSERT INTO user_influencer_follows (user_id, influencer_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, influencer_id) DO NOTHING`,
        [userId, id]
      );

      // Update style profile
      await StyleProfileService.updateProfile(
        userId,
        'follow',
        'influencer',
        id,
        {
          style_archetype: influencer.style_archetype,
          price_tier: influencer.price_tier,
          category_focus: influencer.category_focus,
          commerce_readiness_score: influencer.commerce_readiness_score,
        }
      );

      logger.info(`User ${userId} followed influencer ${id}`);

      res.json({
        success: true,
        message: 'Influencer followed successfully',
        influencer: {
          id: influencer.id,
          display_name: influencer.display_name,
          username: influencer.username,
        },
      });
    } catch (error) {
      logger.error('Error following influencer:', error);
      res.status(500).json({ error: 'Failed to follow influencer' });
    }
  }

  /**
   * DELETE /api/v1/influencers/:id/unfollow
   * Unfollow an influencer
   */
  static async unfollowInfluencer(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const result = await pool.query(
        `DELETE FROM user_influencer_follows
         WHERE user_id = $1 AND influencer_id = $2
         RETURNING id`,
        [userId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Follow relationship not found' });
      }

      logger.info(`User ${userId} unfollowed influencer ${id}`);

      res.json({
        success: true,
        message: 'Influencer unfollowed successfully',
      });
    } catch (error) {
      logger.error('Error unfollowing influencer:', error);
      res.status(500).json({ error: 'Failed to unfollow influencer' });
    }
  }

  /**
   * GET /api/v1/influencers/following
   * Get influencers the user is following
   */
  static async getFollowedInfluencers(req, res) {
    try {
      const userId = req.userId;

      const result = await pool.query(
        `SELECT
          fi.id,
          fi.display_name,
          fi.username,
          fi.profile_picture_url,
          fi.follower_count,
          fi.style_archetype,
          fi.price_tier,
          fi.category_focus,
          uif.followed_at
         FROM user_influencer_follows uif
         JOIN fashion_influencers fi ON uif.influencer_id = fi.id
         WHERE uif.user_id = $1
         ORDER BY uif.followed_at DESC`,
        [userId]
      );

      res.json({
        influencers: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Error fetching followed influencers:', error);
      res.status(500).json({ error: 'Failed to fetch followed influencers' });
    }
  }

  /**
   * GET /api/v1/influencers/recommended
   * Get personalized influencer recommendations based on style profile
   */
  static async getRecommendedInfluencers(req, res) {
    try {
      const userId = req.userId;
      const { limit = 10 } = req.query;

      // Get user's style preferences
      const preferences = await StyleProfileService.getTopPreferences(userId);

      // If user has no style profile yet, return popular influencers
      if (!preferences || preferences.confidence < 0.3) {
        const result = await pool.query(
          `SELECT
            id,
            display_name,
            username,
            profile_picture_url,
            follower_count,
            style_archetype,
            price_tier,
            category_focus
           FROM fashion_influencers
           WHERE is_fashion_influencer = true
           ORDER BY follower_count DESC
           LIMIT $1`,
          [parseInt(limit)]
        );

        return res.json({
          influencers: result.rows,
          reason: 'popular',
          message: 'Follow influencers to get personalized recommendations',
        });
      }

      // Get influencers matching user's style profile
      const topStyle = preferences.top_styles[0]?.name;
      const topPriceTier = preferences.primary_price_tier?.name;

      const result = await pool.query(
        `SELECT
          fi.id,
          fi.display_name,
          fi.username,
          fi.profile_picture_url,
          fi.follower_count,
          fi.style_archetype,
          fi.price_tier,
          fi.category_focus,
          CASE
            WHEN fi.style_archetype = $1 THEN 3
            ELSE 0
          END +
          CASE
            WHEN fi.price_tier = $2 THEN 2
            ELSE 0
          END as match_score
         FROM fashion_influencers fi
         LEFT JOIN user_influencer_follows uif
           ON uif.influencer_id = fi.id AND uif.user_id = $3
         WHERE fi.is_fashion_influencer = true
           AND uif.id IS NULL
         ORDER BY match_score DESC, fi.follower_count DESC
         LIMIT $4`,
        [topStyle, topPriceTier, userId, parseInt(limit)]
      );

      res.json({
        influencers: result.rows,
        reason: 'personalized',
        message: `Based on your ${topStyle} style`,
      });
    } catch (error) {
      logger.error('Error fetching recommended influencers:', error);
      res.status(500).json({ error: 'Failed to fetch recommended influencers' });
    }
  }
}

module.exports = InfluencerController;
