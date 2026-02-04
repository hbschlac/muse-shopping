/**
 * Style Profile Service
 * Manages user style profiles based on influencer follows and shopping behavior
 *
 * Based on specification from docs/claude_ingestion/style_profile_scoring_function_spec.md
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

// Event weights from spec
const EVENT_WEIGHTS = {
  follow: 1.0,
  like: 0.6,
  save: 0.9,
  click: 0.5,
  add_to_cart: 1.2,
  purchase: 1.5
};

class StyleProfileService {
  /**
   * Get or create style profile for a user
   */
  static async getOrCreateProfile(userId) {
    try {
      let result = await pool.query(
        'SELECT * FROM style_profiles WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create new profile
        result = await pool.query(
          `INSERT INTO style_profiles (user_id)
           VALUES ($1)
           RETURNING *`,
          [userId]
        );
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting/creating style profile:', error);
      throw error;
    }
  }

  /**
   * Update style profile based on an event
   *
   * @param {number} userId - User ID
   * @param {string} eventType - 'follow', 'like', 'save', 'click', 'add_to_cart', 'purchase'
   * @param {string} sourceType - 'influencer', 'product', 'retailer'
   * @param {number} sourceId - ID of influencer/product/retailer
   * @param {object} metadata - Additional event metadata
   */
  static async updateProfile(userId, eventType, sourceType, sourceId, metadata = {}) {
    try {
      const weight = EVENT_WEIGHTS[eventType] || 0.5;

      // Get current profile
      const profile = await this.getOrCreateProfile(userId);

      // Get source metadata
      let sourceMetadata = {};
      if (sourceType === 'influencer') {
        sourceMetadata = await this.getInfluencerMetadata(sourceId);
      } else if (sourceType === 'product') {
        sourceMetadata = await this.getProductMetadata(sourceId);
      }

      // Calculate layer updates
      const layerUpdates = this.calculateLayerUpdates(
        profile,
        weight,
        sourceType,
        sourceMetadata
      );

      // Update profile in database
      const updatedProfile = await this.applyLayerUpdates(
        userId,
        layerUpdates,
        weight,
        sourceMetadata
      );

      // Log the event
      await pool.query(
        `INSERT INTO style_profile_events (
          user_id, event_type, source_type, source_id, weight, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, eventType, sourceType, sourceId, weight, JSON.stringify(sourceMetadata)]
      );

      logger.info(`Style profile updated for user ${userId}: ${eventType} on ${sourceType}`);

      return updatedProfile;
    } catch (error) {
      logger.error('Error updating style profile:', error);
      throw error;
    }
  }

  /**
   * Get influencer metadata for profile scoring
   */
  static async getInfluencerMetadata(influencerId) {
    try {
      const result = await pool.query(
        `SELECT
          style_archetype,
          price_tier,
          category_focus,
          commerce_readiness_score
         FROM fashion_influencers
         WHERE id = $1`,
        [influencerId]
      );

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting influencer metadata:', error);
      return {};
    }
  }

  /**
   * Get product metadata for profile scoring
   */
  static async getProductMetadata(productId) {
    try {
      const result = await pool.query(
        `SELECT
          category,
          price_tier,
          occasion_tag,
          style_tags
         FROM items
         WHERE id = $1`,
        [productId]
      );

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting product metadata:', error);
      return {};
    }
  }

  /**
   * Calculate layer updates based on event
   */
  static calculateLayerUpdates(profile, weight, sourceType, sourceMetadata) {
    const updates = {
      style_layers: { ...profile.style_layers },
      price_layers: { ...profile.price_layers },
      category_layers: { ...profile.category_layers },
      occasion_layers: { ...profile.occasion_layers },
      commerce_intent_delta: 0
    };

    if (sourceType === 'influencer') {
      // Update style layers
      if (sourceMetadata.style_archetype) {
        const style = sourceMetadata.style_archetype;
        updates.style_layers[style] = (updates.style_layers[style] || 0) + weight;
      }

      // Update price layers
      if (sourceMetadata.price_tier) {
        const price = sourceMetadata.price_tier;
        updates.price_layers[price] = (updates.price_layers[price] || 0) + weight;
      }

      // Update category layers
      if (sourceMetadata.category_focus) {
        const category = sourceMetadata.category_focus;
        updates.category_layers[category] = (updates.category_layers[category] || 0) + weight;
      }

      // Update commerce intent
      if (sourceMetadata.commerce_readiness_score >= 20) {
        updates.commerce_intent_delta = 0.1;
      }
    }

    if (sourceType === 'product') {
      // Update category layers
      if (sourceMetadata.category) {
        const category = this.mapProductCategory(sourceMetadata.category);
        updates.category_layers[category] = (updates.category_layers[category] || 0) + weight;
      }

      // Update price layers
      if (sourceMetadata.price_tier) {
        const price = sourceMetadata.price_tier;
        updates.price_layers[price] = (updates.price_layers[price] || 0) + weight;
      }

      // Update occasion layers
      if (sourceMetadata.occasion_tag) {
        const occasion = sourceMetadata.occasion_tag;
        updates.occasion_layers[occasion] = (updates.occasion_layers[occasion] || 0) + weight;
      }

      // Update style layers from product style tags
      if (sourceMetadata.style_tags && Array.isArray(sourceMetadata.style_tags)) {
        sourceMetadata.style_tags.forEach(style => {
          if (updates.style_layers.hasOwnProperty(style)) {
            updates.style_layers[style] = (updates.style_layers[style] || 0) + (weight * 0.5);
          }
        });
      }

      // Purchase significantly increases commerce intent
      if (weight === EVENT_WEIGHTS.purchase) {
        updates.commerce_intent_delta = 0.2;
      }
    }

    return updates;
  }

  /**
   * Map product category to category layer
   */
  static mapProductCategory(category) {
    const categoryMap = {
      'Handbags & Wallets': 'bags',
      'Shoes': 'shoes',
      'Denim': 'denim',
      'Workwear': 'workwear',
      'Dresses': 'occasion',
      'Accessories': 'accessories',
      'Activewear': 'active',
      'Athletic & Sneakers': 'active'
    };

    return categoryMap[category] || 'mixed';
  }

  /**
   * Apply layer updates to profile
   */
  static async applyLayerUpdates(userId, updates, weight, sourceMetadata) {
    try {
      // Calculate new confidence based on total_events
      // Formula: confidence = min(1, log10(total_events + 1) / 2)
      const result = await pool.query(
        `UPDATE style_profiles
         SET
           style_layers = $1::jsonb,
           price_layers = $2::jsonb,
           category_layers = $3::jsonb,
           occasion_layers = $4::jsonb,
           commerce_intent = commerce_intent + $5,
           total_events = total_events + 1,
           confidence = LEAST(1.0, LOG(10, total_events + 2) / 2.0),
           last_event_at = CURRENT_TIMESTAMP
         WHERE user_id = $6
         RETURNING *`,
        [
          JSON.stringify(updates.style_layers),
          JSON.stringify(updates.price_layers),
          JSON.stringify(updates.category_layers),
          JSON.stringify(updates.occasion_layers),
          updates.commerce_intent_delta,
          userId
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error applying layer updates:', error);
      throw error;
    }
  }

  /**
   * Get top style preferences for a user
   */
  static async getTopPreferences(userId) {
    try {
      const profile = await this.getOrCreateProfile(userId);

      return {
        top_styles: this.getTopN(profile.style_layers, 3),
        top_categories: this.getTopN(profile.category_layers, 2),
        primary_price_tier: this.getTopN(profile.price_layers, 1)[0],
        top_occasions: this.getTopN(profile.occasion_layers, 2),
        commerce_intent: profile.commerce_intent,
        confidence: profile.confidence
      };
    } catch (error) {
      logger.error('Error getting top preferences:', error);
      throw error;
    }
  }

  /**
   * Get top N items from a layer object
   */
  static getTopN(layerObj, n) {
    return Object.entries(layerObj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, value]) => ({ name: key, score: value }));
  }

  /**
   * Boost items based on style profile
   * Used in recommendation ranking
   */
  static async boostItemsForUser(userId, items) {
    try {
      const preferences = await this.getTopPreferences(userId);

      // Only boost if we have confidence
      if (preferences.confidence < 0.3) {
        return items; // Not enough data yet
      }

      const boostedItems = items.map(item => {
        let boost = 1.0;

        // Boost based on style match
        if (item.style_tags) {
          const styleMatch = preferences.top_styles.some(style =>
            item.style_tags.includes(style.name)
          );
          if (styleMatch) boost *= 1.3;
        }

        // Boost based on category match
        const itemCategory = this.mapProductCategory(item.category);
        const categoryMatch = preferences.top_categories.some(cat =>
          cat.name === itemCategory
        );
        if (categoryMatch) boost *= 1.2;

        // Boost based on price tier match
        if (item.price_tier === preferences.primary_price_tier?.name) {
          boost *= 1.15;
        }

        // Boost based on occasion match
        if (item.occasion_tag) {
          const occasionMatch = preferences.top_occasions.some(occ =>
            occ.name === item.occasion_tag
          );
          if (occasionMatch) boost *= 1.1;
        }

        return {
          ...item,
          style_boost: boost,
          boosted_score: (item.score || 1.0) * boost
        };
      });

      // Re-sort by boosted score
      return boostedItems.sort((a, b) => b.boosted_score - a.boosted_score);
    } catch (error) {
      logger.error('Error boosting items:', error);
      return items; // Return unboosted on error
    }
  }

  /**
   * Create weekly snapshot of style profile
   */
  static async createSnapshot(userId, reason = 'weekly') {
    try {
      const profile = await this.getOrCreateProfile(userId);

      await pool.query(
        `INSERT INTO style_profile_snapshots (
          user_id, style_layers, price_layers, category_layers,
          occasion_layers, commerce_intent, confidence,
          total_events, snapshot_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          profile.style_layers,
          profile.price_layers,
          profile.category_layers,
          profile.occasion_layers,
          profile.commerce_intent,
          profile.confidence,
          profile.total_events,
          reason
        ]
      );

      logger.info(`Created style profile snapshot for user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error creating snapshot:', error);
    }
  }

  /**
   * Apply weekly decay to all profiles
   * Multiply all layer scores by 0.98 to reflect changing tastes
   */
  static async applyWeeklyDecay() {
    try {
      const result = await pool.query(
        `UPDATE style_profiles
         SET
           style_layers = jsonb_object_agg(
             key,
             (value::text::numeric * 0.98)::text::numeric
           ) FROM jsonb_each_text(style_layers)
         RETURNING user_id`
      );

      logger.info(`Applied weekly decay to ${result.rows.length} style profiles`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error applying weekly decay:', error);
      throw error;
    }
  }
}

module.exports = StyleProfileService;
