/**
 * StyleProfile Model
 * Handles user style preferences derived from influencer signals and shopping behavior
 */

const pool = require('../db/pool');

class StyleProfile {
  /**
   * Get or create style profile for a user
   * @param {number} userId
   * @returns {Promise<Object>} Style profile
   */
  static async getOrCreate(userId) {
    const result = await pool.query(
      `INSERT INTO style_profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId]
    );
    return this.formatProfile(result.rows[0]);
  }

  /**
   * Get style profile by user ID
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM style_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? this.formatProfile(result.rows[0]) : null;
  }

  /**
   * Update style profile scores
   * @param {number} userId
   * @param {Object} updates - Object with score updates
   * @returns {Promise<Object>}
   */
  static async update(userId, updates) {
    const allowedFields = [
      'style_minimal', 'style_streetwear', 'style_glam', 'style_classic',
      'style_boho', 'style_athleisure', 'style_romantic', 'style_edgy',
      'style_preppy', 'style_avant_garde',
      'price_budget', 'price_mid', 'price_premium', 'price_luxury',
      'category_bags', 'category_shoes', 'category_denim', 'category_workwear',
      'category_occasion', 'category_accessories', 'category_active', 'category_mixed',
      'occasion_work', 'occasion_event', 'occasion_casual', 'occasion_athleisure',
      'commerce_intent', 'confidence', 'total_signals',
    ];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findByUserId(userId);
    }

    values.push(userId);
    const query = `
      UPDATE style_profiles
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return this.formatProfile(result.rows[0]);
  }

  /**
   * Record a style profile event
   * @param {Object} event
   * @returns {Promise<Object>}
   */
  static async recordEvent(event) {
    const {
      userId,
      eventType,
      eventWeight,
      influencerId = null,
      productId = null,
      brandId = null,
      styleArchetype = null,
      priceTier = null,
      categoryFocus = null,
    } = event;

    const result = await pool.query(
      `INSERT INTO style_profile_events
        (user_id, event_type, event_weight, influencer_id, product_id, brand_id,
         style_archetype, price_tier, category_focus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        eventType,
        eventWeight,
        influencerId,
        productId,
        brandId,
        styleArchetype,
        priceTier,
        categoryFocus,
      ]
    );

    return result.rows[0];
  }

  /**
   * Get recent events for a user
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getEvents(userId, limit = 100) {
    const result = await pool.query(
      `SELECT * FROM style_profile_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Get top styles for a user (for personalization copy)
   * @param {number} userId
   * @param {number} topN
   * @returns {Promise<Array>} Array of {style, score}
   */
  static async getTopStyles(userId, topN = 2) {
    const profile = await this.findByUserId(userId);
    if (!profile) return [];

    const styles = profile.style_layers;
    const sorted = Object.entries(styles)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN);

    return sorted.map(([style, score]) => ({
      style: style.replace('style_', ''),
      score,
    }));
  }

  /**
   * Get top price tier for a user
   * @param {number} userId
   * @returns {Promise<string|null>}
   */
  static async getTopPriceTier(userId) {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    const priceTiers = profile.price_layers;
    const sorted = Object.entries(priceTiers).sort(([, a], [, b]) => b - a);

    return sorted[0] ? sorted[0][0].replace('price_', '') : null;
  }

  /**
   * Format profile for API response
   * @param {Object} row - Database row
   * @returns {Object}
   */
  static formatProfile(row) {
    if (!row) return null;

    return {
      id: row.id,
      user_id: row.user_id,
      style_layers: {
        minimal: parseFloat(row.style_minimal),
        streetwear: parseFloat(row.style_streetwear),
        glam: parseFloat(row.style_glam),
        classic: parseFloat(row.style_classic),
        boho: parseFloat(row.style_boho),
        athleisure: parseFloat(row.style_athleisure),
        romantic: parseFloat(row.style_romantic),
        edgy: parseFloat(row.style_edgy),
        preppy: parseFloat(row.style_preppy),
        avant_garde: parseFloat(row.style_avant_garde),
      },
      price_layers: {
        budget: parseFloat(row.price_budget),
        mid: parseFloat(row.price_mid),
        premium: parseFloat(row.price_premium),
        luxury: parseFloat(row.price_luxury),
      },
      category_layers: {
        bags: parseFloat(row.category_bags),
        shoes: parseFloat(row.category_shoes),
        denim: parseFloat(row.category_denim),
        workwear: parseFloat(row.category_workwear),
        occasion: parseFloat(row.category_occasion),
        accessories: parseFloat(row.category_accessories),
        active: parseFloat(row.category_active),
        mixed: parseFloat(row.category_mixed),
      },
      occasion_layers: {
        work: parseFloat(row.occasion_work),
        event: parseFloat(row.occasion_event),
        casual: parseFloat(row.occasion_casual),
        athleisure: parseFloat(row.occasion_athleisure),
      },
      commerce_intent: parseFloat(row.commerce_intent),
      confidence: parseFloat(row.confidence),
      total_signals: row.total_signals,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

module.exports = StyleProfile;
