/**
 * Instagram Style Profiling Service
 * Aggregates style insights from followed influencers to create user style profiles
 */

const pool = require('../db/pool');
const InstagramDataService = require('./instagramDataService');
const InfluencerAnalysisService = require('./influencerAnalysisService');
const StyleProfileService = require('./styleProfileService');
const logger = require('../utils/logger');

class InstagramStyleProfilingService {
  /**
   * Link user to influencer they follow
   * @param {number} userId - User ID
   * @param {number} influencerId - Influencer ID
   * @param {number} influenceWeight - Optional weight (default 1.0)
   * @returns {Promise<Object>} Created relationship
   */
  static async linkUserToInfluencer(userId, influencerId, influenceWeight = 1.0) {
    const query = `
      INSERT INTO user_instagram_follows (user_id, influencer_id, influence_weight, discovered_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, influencer_id) DO UPDATE
      SET influence_weight = EXCLUDED.influence_weight,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [userId, influencerId, influenceWeight]);

    // Track style profile event for following influencer
    try {
      await StyleProfileService.updateProfile(
        userId,
        'follow',
        'influencer',
        influencerId
      );
    } catch (profileError) {
      logger.error('Error updating style profile for influencer follow:', profileError);
      // Don't fail the request if profile update fails
    }

    return result.rows[0];
  }

  /**
   * Get influencers followed by user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of influencers
   */
  static async getUserInfluencers(userId) {
    const query = `
      SELECT
        fi.*,
        uif.influence_weight,
        uif.discovered_at
      FROM user_instagram_follows uif
      JOIN fashion_influencers fi ON uif.influencer_id = fi.id
      WHERE uif.user_id = $1
      ORDER BY fi.follower_count DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Aggregate category preferences from followed influencers
   * @param {Array} influencers - List of influencers with their profiles
   * @returns {Object} Aggregated category scores
   */
  static aggregateCategoryPreferences(influencers) {
    const categoryScores = {};
    let totalWeight = 0;

    influencers.forEach(influencer => {
      if (!influencer.primary_categories) return;

      const weight = influencer.influence_weight || 1.0;
      totalWeight += weight;

      const categories = typeof influencer.primary_categories === 'string'
        ? JSON.parse(influencer.primary_categories)
        : influencer.primary_categories;

      Object.entries(categories).forEach(([category, score]) => {
        categoryScores[category] = (categoryScores[category] || 0) + (score * weight);
      });
    });

    // Normalize scores
    if (totalWeight > 0) {
      Object.keys(categoryScores).forEach(category => {
        categoryScores[category] = parseFloat((categoryScores[category] / totalWeight).toFixed(2));
      });
    }

    return categoryScores;
  }

  /**
   * Aggregate aesthetic preferences from followed influencers
   * @param {Array} influencers - List of influencers
   * @returns {Array} Sorted list of aesthetics
   */
  static aggregateAestheticPreferences(influencers) {
    const aestheticCounts = {};

    influencers.forEach(influencer => {
      if (!influencer.aesthetic_tags) return;

      const aesthetics = Array.isArray(influencer.aesthetic_tags)
        ? influencer.aesthetic_tags
        : [];

      aesthetics.forEach(aesthetic => {
        aestheticCounts[aesthetic] = (aestheticCounts[aesthetic] || 0) + 1;
      });
    });

    // Return aesthetics sorted by frequency
    return Object.entries(aestheticCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([aesthetic]) => aesthetic)
      .slice(0, 10); // Top 10 aesthetics
  }

  /**
   * Aggregate color preferences from followed influencers
   * @param {Array} influencers - List of influencers
   * @returns {Object} Aggregated color scores
   */
  static aggregateColorPreferences(influencers) {
    const colorScores = {};
    let totalWeight = 0;

    influencers.forEach(influencer => {
      if (!influencer.color_palette) return;

      const weight = influencer.influence_weight || 1.0;
      totalWeight += weight;

      const colors = typeof influencer.color_palette === 'string'
        ? JSON.parse(influencer.color_palette)
        : influencer.color_palette;

      Object.entries(colors).forEach(([color, score]) => {
        colorScores[color] = (colorScores[color] || 0) + (score * weight);
      });
    });

    // Normalize scores
    if (totalWeight > 0) {
      Object.keys(colorScores).forEach(color => {
        colorScores[color] = parseFloat((colorScores[color] / totalWeight).toFixed(2));
      });
    }

    return colorScores;
  }

  /**
   * Determine price tier preference from followed influencers
   * @param {Array} influencers - List of influencers
   * @returns {string} Most common price tier
   */
  static determinePriceTierPreference(influencers) {
    const tierCounts = {};

    influencers.forEach(influencer => {
      if (influencer.price_tier) {
        tierCounts[influencer.price_tier] = (tierCounts[influencer.price_tier] || 0) + 1;
      }
    });

    // Return most common tier
    const sortedTiers = Object.entries(tierCounts)
      .sort((a, b) => b[1] - a[1]);

    return sortedTiers.length > 0 ? sortedTiers[0][0] : 'mid-range';
  }

  /**
   * Aggregate brand preferences from followed influencers
   * @param {Array} influencers - List of influencers
   * @returns {Array} List of frequently mentioned brands
   */
  static aggregateBrandPreferences(influencers) {
    const brandCounts = {};

    influencers.forEach(influencer => {
      if (!influencer.brand_affiliations) return;

      const brands = Array.isArray(influencer.brand_affiliations)
        ? influencer.brand_affiliations
        : [];

      brands.forEach(brand => {
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      });
    });

    // Return brands sorted by frequency
    return Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([brand]) => brand)
      .slice(0, 20); // Top 20 brands
  }

  /**
   * Calculate average influencer tier
   * @param {Array} influencers - List of influencers
   * @returns {string} Average tier
   */
  static calculateAverageInfluencerTier(influencers) {
    const tierValues = {
      'mega': 4,
      'macro': 3,
      'micro': 2,
      'nano': 1,
      'user': 0
    };

    const tierToString = {
      4: 'mega',
      3: 'macro',
      2: 'micro',
      1: 'nano',
      0: 'user'
    };

    const avgValue = influencers.reduce((sum, inf) => {
      return sum + (tierValues[inf.influencer_tier] || 0);
    }, 0) / influencers.length;

    const roundedValue = Math.round(avgValue);
    return tierToString[roundedValue] || 'micro';
  }

  /**
   * Calculate confidence score based on data quality
   * @param {Array} influencers - List of influencers
   * @param {Object} aggregatedData - Aggregated style data
   * @returns {Object} Confidence scores
   */
  static calculateConfidenceScores(influencers, aggregatedData) {
    // Category confidence based on number of categories and influencers
    const categoryCount = Object.keys(aggregatedData.categories || {}).length;
    const influencerCount = influencers.length;

    let categoryConfidence = 0;
    if (influencerCount >= 10 && categoryCount >= 5) categoryConfidence = 95;
    else if (influencerCount >= 5 && categoryCount >= 3) categoryConfidence = 80;
    else if (influencerCount >= 3 && categoryCount >= 2) categoryConfidence = 60;
    else if (influencerCount >= 1) categoryConfidence = 40;

    // Aesthetic confidence based on number of aesthetics and influencers
    const aestheticCount = (aggregatedData.aesthetics || []).length;
    let aestheticConfidence = 0;
    if (influencerCount >= 5 && aestheticCount >= 3) aestheticConfidence = 90;
    else if (influencerCount >= 3 && aestheticCount >= 2) aestheticConfidence = 70;
    else if (influencerCount >= 1 && aestheticCount >= 1) aestheticConfidence = 50;

    // Overall confidence is average of individual confidences
    const overallConfidence = parseFloat(((categoryConfidence + aestheticConfidence) / 2).toFixed(2));

    return {
      categoryConfidence,
      aestheticConfidence,
      overallConfidence
    };
  }

  /**
   * Create or update user's Instagram style insights
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Style insights
   */
  static async buildStyleProfile(userId) {
    try {
      // Get all influencers user follows
      const influencers = await this.getUserInfluencers(userId);

      if (influencers.length === 0) {
        logger.info(`No influencers found for user ${userId}`);
        return null;
      }

      // Filter only fashion influencers
      const fashionInfluencers = influencers.filter(inf => inf.is_fashion_influencer);

      logger.info(`Building style profile for user ${userId} from ${fashionInfluencers.length} fashion influencers`);

      // Aggregate data
      const categories = this.aggregateCategoryPreferences(fashionInfluencers);
      const aesthetics = this.aggregateAestheticPreferences(fashionInfluencers);
      const colors = this.aggregateColorPreferences(fashionInfluencers);
      const priceTier = this.determinePriceTierPreference(fashionInfluencers);
      const brands = this.aggregateBrandPreferences(fashionInfluencers);
      const avgTier = this.calculateAverageInfluencerTier(fashionInfluencers);

      // Calculate confidence scores
      const confidence = this.calculateConfidenceScores(fashionInfluencers, {
        categories,
        aesthetics
      });

      // Count total posts analyzed
      const totalPostsAnalyzed = fashionInfluencers.reduce((sum, inf) => {
        return sum + (inf.posts_analyzed || 0);
      }, 0);

      // Save to database
      const query = `
        INSERT INTO instagram_style_insights (
          user_id,
          top_categories,
          aesthetic_preferences,
          preferred_colors,
          price_tier_preference,
          favorite_brands,
          total_influencers_followed,
          fashion_influencers_followed,
          avg_influencer_tier,
          last_synced_at,
          sync_status,
          posts_analyzed,
          category_confidence,
          aesthetic_confidence,
          overall_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, 'completed', $10, $11, $12, $13)
        ON CONFLICT (user_id)
        DO UPDATE SET
          top_categories = EXCLUDED.top_categories,
          aesthetic_preferences = EXCLUDED.aesthetic_preferences,
          preferred_colors = EXCLUDED.preferred_colors,
          price_tier_preference = EXCLUDED.price_tier_preference,
          favorite_brands = EXCLUDED.favorite_brands,
          total_influencers_followed = EXCLUDED.total_influencers_followed,
          fashion_influencers_followed = EXCLUDED.fashion_influencers_followed,
          avg_influencer_tier = EXCLUDED.avg_influencer_tier,
          last_synced_at = CURRENT_TIMESTAMP,
          sync_status = 'completed',
          posts_analyzed = EXCLUDED.posts_analyzed,
          category_confidence = EXCLUDED.category_confidence,
          aesthetic_confidence = EXCLUDED.aesthetic_confidence,
          overall_confidence = EXCLUDED.overall_confidence,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await pool.query(query, [
        userId,
        JSON.stringify(categories),
        aesthetics,
        JSON.stringify(colors),
        priceTier,
        brands,
        influencers.length,
        fashionInfluencers.length,
        avgTier,
        totalPostsAnalyzed,
        confidence.categoryConfidence,
        confidence.aestheticConfidence,
        confidence.overallConfidence
      ]);

      const styleInsights = result.rows[0];

      logger.info(`Style profile built for user ${userId}: ${fashionInfluencers.length} influencers, confidence: ${confidence.overallConfidence}%`);

      return styleInsights;
    } catch (error) {
      logger.error(`Error building style profile for user ${userId}:`, error);

      // Mark as failed
      await pool.query(
        `UPDATE instagram_style_insights
         SET sync_status = 'failed', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );

      throw error;
    }
  }

  /**
   * Get user's Instagram style insights
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Style insights or null
   */
  static async getStyleInsights(userId) {
    const result = await pool.query(
      'SELECT * FROM instagram_style_insights WHERE user_id = $1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Full Instagram analysis workflow for a user
   * @param {number} userId - User ID
   * @param {Array<string>} influencerUsernames - List of influencer usernames to analyze
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeUserInstagram(userId, influencerUsernames) {
    const results = {
      userId,
      influencersAnalyzed: 0,
      influencersLinked: 0,
      styleProfileCreated: false,
      errors: []
    };

    try {
      // Create sync job
      const jobResult = await pool.query(
        `INSERT INTO instagram_sync_jobs (user_id, job_type, status, started_at)
         VALUES ($1, 'full_analysis', 'processing', CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId]
      );

      const jobId = jobResult.rows[0].id;

      logger.info(`Starting Instagram analysis for user ${userId} with ${influencerUsernames.length} influencers`);

      // Process each influencer
      for (const username of influencerUsernames) {
        try {
          // Check if influencer already exists
          let influencer = await InfluencerAnalysisService.getInfluencerByUsername(username);

          if (!influencer) {
            // Fetch and analyze new influencer
            // Note: This requires external API or data source for public profiles
            logger.info(`Influencer @${username} not in database - would fetch and analyze`);
            // TODO: Integrate with Instagram public API or scraping service
            continue;
          }

          // Link user to influencer
          await this.linkUserToInfluencer(userId, influencer.id);
          results.influencersLinked++;

          results.influencersAnalyzed++;
        } catch (error) {
          logger.error(`Error processing influencer @${username}:`, error);
          results.errors.push({ username, error: error.message });
        }
      }

      // Build style profile from linked influencers
      const styleProfile = await this.buildStyleProfile(userId);
      results.styleProfileCreated = !!styleProfile;
      results.styleProfile = styleProfile;

      // Update sync job as completed
      await pool.query(
        `UPDATE instagram_sync_jobs
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             influencers_analyzed = $1,
             progress = 100
         WHERE id = $2`,
        [results.influencersAnalyzed, jobId]
      );

      logger.info(`Instagram analysis completed for user ${userId}: ${results.influencersAnalyzed} influencers analyzed`);

      return results;
    } catch (error) {
      logger.error(`Error in Instagram analysis for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze user's own Instagram content to find mentioned influencers
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of discovered influencer usernames
   */
  static async discoverInfluencersFromUserContent(userId) {
    try {
      // Fetch user's Instagram data
      const userData = await InstagramDataService.syncUserData(userId);

      // Extract mentions from posts
      const mentions = userData.mentions || [];

      logger.info(`Discovered ${mentions.length} potential influencers from user ${userId}'s content`);

      return mentions;
    } catch (error) {
      logger.error(`Error discovering influencers for user ${userId}:`, error);
      return [];
    }
  }
}

module.exports = InstagramStyleProfilingService;
