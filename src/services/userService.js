const User = require('../models/User');
const pool = require('../db/pool');
const { NotFoundError } = require('../utils/errors');

class UserService {
  static async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const profile = await User.getProfile(userId);

    // Fetch personalization data
    const personalizationData = await this.getPersonalizationData(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        profile_image_url: user.profile_image_url,
        is_verified: user.is_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      profile: profile || {},
      personalization: personalizationData,
    };
  }

  /**
   * Get personalization data for user profile
   */
  static async getPersonalizationData(userId) {
    try {
      // Get style profile (100D)
      const styleProfileResult = await pool.query(
        `SELECT
          confidence,
          total_events,
          style_layers,
          price_layers,
          category_layers,
          color_palette_layers,
          brand_tier_layers
        FROM style_profiles
        WHERE user_id = $1`,
        [userId]
      );

      // Get shopper profile
      const shopperProfileResult = await pool.query(
        `SELECT
          favorite_categories,
          common_sizes,
          price_range,
          interests
        FROM shopper_profiles
        WHERE user_id = $1`,
        [userId]
      );

      // Get engagement metrics
      const metricsResult = await pool.query(
        `SELECT
          total_sessions,
          total_product_views,
          total_clicks,
          total_cart_adds,
          total_purchases,
          avg_session_duration_seconds,
          last_activity_at
        FROM shopper_engagement_metrics
        WHERE user_id = $1`,
        [userId]
      );

      // Get user segments
      const segmentsResult = await pool.query(
        `SELECT
          s.segment_name,
          s.description,
          ssm.confidence_score
        FROM shopper_segment_membership ssm
        JOIN shopper_segments s ON ssm.segment_id = s.id
        WHERE ssm.user_id = $1
        ORDER BY ssm.confidence_score DESC
        LIMIT 5`,
        [userId]
      );

      const styleProfile = styleProfileResult.rows[0] || null;
      const shopperProfile = shopperProfileResult.rows[0] || null;
      const metrics = metricsResult.rows[0] || null;
      const segments = segmentsResult.rows || [];

      // Extract top preferences if they exist
      let topCategories = [];
      let topColors = [];
      let pricePreference = null;

      if (styleProfile) {
        // Extract top categories
        if (styleProfile.category_layers) {
          topCategories = Object.entries(styleProfile.category_layers)
            .map(([name, score]) => ({ name, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        }

        // Extract top colors
        if (styleProfile.color_palette_layers) {
          topColors = Object.entries(styleProfile.color_palette_layers)
            .map(([name, score]) => ({ name, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        }

        // Extract price preference
        if (styleProfile.price_layers) {
          const priceEntries = Object.entries(styleProfile.price_layers);
          if (priceEntries.length > 0) {
            const topPrice = priceEntries.sort((a, b) => b[1] - a[1])[0];
            pricePreference = topPrice[0];
          }
        }
      }

      return {
        styleProfile: styleProfile ? {
          confidence: styleProfile.confidence || 0,
          totalEvents: styleProfile.total_events || 0,
          topCategories,
          topColors,
          pricePreference,
        } : null,
        shopperProfile: shopperProfile ? {
          favoriteCategories: shopperProfile.favorite_categories || [],
          commonSizes: shopperProfile.common_sizes || [],
          priceRange: shopperProfile.price_range || null,
          interests: shopperProfile.interests || [],
        } : null,
        metrics: metrics ? {
          sessionsCount: metrics.total_sessions || 0,
          productsViewed: metrics.total_product_views || 0,
          productsClicked: metrics.total_clicks || 0,
          itemsAddedToCart: metrics.total_cart_adds || 0,
          purchasesCount: metrics.total_purchases || 0,
          avgSessionDuration: metrics.avg_session_duration_seconds || 0,
          lastActiveAt: metrics.last_activity_at,
        } : null,
        segments: segments.map(s => ({
          name: s.segment_name,
          description: s.description,
          score: s.confidence_score,
        })),
      };
    } catch (error) {
      // If personalization data fetch fails, return null (don't break profile page)
      console.error('Error fetching personalization data:', error.message);
      console.error('Stack:', error.stack);
      return {
        styleProfile: null,
        shopperProfile: null,
        metrics: null,
        segments: [],
        error: error.message, // Include error for debugging
      };
    }
  }

  static async updateUser(userId, updates) {
    const user = await User.update(userId, updates);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  static async updateUserProfile(userId, updates) {
    const bcrypt = require('bcrypt');

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Handle password update separately if provided
    if (updates.password) {
      const hashedPassword = await bcrypt.hash(
        updates.password,
        parseInt(process.env.BCRYPT_ROUNDS) || 10
      );
      await User.updatePassword(userId, hashedPassword);
      delete updates.password; // Remove from profile updates
    }

    // Handle full_name update on the users table
    if (updates.full_name) {
      await User.update(userId, { full_name: updates.full_name });
      delete updates.full_name; // Remove from profile updates
    }

    // Check if profile exists, create if not
    let profile = await User.getProfile(userId);
    if (!profile) {
      profile = await User.createProfile(userId);
    }

    // Update profile with remaining fields
    const updatedProfile = await User.updateProfile(userId, updates);
    return updatedProfile;
  }

  static async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    await User.delete(userId);
  }
}

module.exports = UserService;
