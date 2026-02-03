const pool = require('../db/pool');
const logger = require('../utils/logger');

class ChatPreferenceIngestionService {
  static async ingestFromIntent({ userId, sessionId, messageId, intent }) {
    if (!userId || !intent || !intent.filters) return null;

    const filters = intent.filters || {};
    const categories = Array.isArray(filters.categories) ? filters.categories : [];
    const subcategories = Array.isArray(filters.subcategories) ? filters.subcategories : [];
    const attributes = Array.isArray(filters.attributes) ? filters.attributes : [];
    const priceMin = typeof filters.min_price === 'number' ? Math.round(filters.min_price * 100) : null;
    const priceMax = typeof filters.max_price === 'number' ? Math.round(filters.max_price * 100) : null;

    const eventResult = await pool.query(
      `INSERT INTO chat_preference_events
        (user_id, session_id, message_id, categories, subcategories, attributes, price_min, price_max, on_sale, in_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        sessionId || null,
        messageId || null,
        JSON.stringify(categories),
        JSON.stringify(subcategories),
        JSON.stringify(attributes),
        priceMin,
        priceMax,
        typeof filters.on_sale === 'boolean' ? filters.on_sale : null,
        typeof filters.in_stock === 'boolean' ? filters.in_stock : null,
      ]
    );

    await this._applyToShopperProfile(userId, { categories, priceMin, priceMax });
    logger.info(`Chat preference event stored for user ${userId}`);

    return eventResult.rows[0];
  }

  static async _applyToShopperProfile(userId, { categories = [], priceMin = null, priceMax = null }) {
    const profileRes = await pool.query(
      'SELECT favorite_categories, price_range FROM shopper_profiles WHERE user_id = $1',
      [userId]
    );

    let favorite = {};
    let priceRange = { min: 0, max: 0, avg: 0 };

    if (profileRes.rows.length > 0) {
      favorite = profileRes.rows[0].favorite_categories || {};
      priceRange = profileRes.rows[0].price_range || priceRange;
    }

    categories.forEach((cat) => {
      if (!cat) return;
      favorite[cat] = (favorite[cat] || 0) + 1;
    });

    if (priceMin !== null || priceMax !== null) {
      priceRange.min = priceMin !== null ? Math.min(priceRange.min || priceMin, priceMin) : priceRange.min;
      priceRange.max = priceMax !== null ? Math.max(priceRange.max || priceMax, priceMax) : priceRange.max;
      if (!priceRange.avg) {
        const avgBase = (priceRange.min + priceRange.max) / 2;
        priceRange.avg = avgBase || priceRange.avg;
      }
    }

    await pool.query(
      `INSERT INTO shopper_profiles (user_id, favorite_categories, price_range, last_analyzed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET favorite_categories = EXCLUDED.favorite_categories,
             price_range = EXCLUDED.price_range,
             last_analyzed_at = NOW(),
             updated_at = NOW()`,
      [userId, JSON.stringify(favorite), JSON.stringify(priceRange)]
    );
  }
}

module.exports = ChatPreferenceIngestionService;
