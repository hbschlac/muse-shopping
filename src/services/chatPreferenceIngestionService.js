const pool = require('../db/pool');
const logger = require('../utils/logger');
const PreferencesService = require('./preferencesService');
const ChatNormalizationService = require('./chatNormalizationService');
const ChatProfileDiffService = require('./chatProfileDiffService');
const ChatProfileVersionService = require('./chatProfileVersionService');

class ChatPreferenceIngestionService {
  static _decayWeight() {
    return 1.0; // scaffold for time-decay logic
  }
  static async ingestFromIntent({ userId, sessionId, messageId, intent }) {
    if (!userId || !intent || !intent.filters) return null;

    const filters = intent.filters || {};
    const colors = ChatNormalizationService.normalizeColors(
      Array.isArray(filters.colors) ? filters.colors : []
    );
    const sizes = ChatNormalizationService.normalizeSizes(
      Array.isArray(filters.sizes) ? filters.sizes : []
    );
    const materials = ChatNormalizationService.normalizeMaterials(
      Array.isArray(filters.materials) ? filters.materials : []
    );
    const fits = ChatNormalizationService.normalizeFits(
      Array.isArray(filters.fits) ? filters.fits : []
    );
    const occasions = ChatNormalizationService.normalizeOccasions(
      Array.isArray(filters.occasions) ? filters.occasions : []
    );
    const categories = ChatNormalizationService.normalizeCategoryList(
      Array.isArray(filters.categories) ? filters.categories : []
    );
    const subcategories = Array.isArray(filters.subcategories) ? filters.subcategories : [];
    const attributes = ChatNormalizationService.normalizeAttributes(
      Array.isArray(filters.attributes) ? filters.attributes : []
    );
    const priceRange = ChatNormalizationService.normalizePriceRange({
      min: typeof filters.min_price === 'number' ? filters.min_price : null,
      max: typeof filters.max_price === 'number' ? filters.max_price : null,
    });
    const priceMin = priceRange.min ?? null;
    const priceMax = priceRange.max ?? null;

    const eventResult = await pool.query(
      `INSERT INTO chat_preference_events
        (user_id, session_id, message_id, categories, subcategories, attributes, price_min, price_max, on_sale, in_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        this._decayWeight(),
      ]
    );

    await ChatProfileVersionService.snapshot(userId);
    await ChatProfileDiffService.captureBeforeAfter(userId, async () => {
      await this._applyToShopperProfile(userId, { categories, priceMin, priceMax });
      // diff capture handles both updates
    // await this._applyToFashionPreferences(userId, { categories, attributes, colors, sizes, occasions, materials, fits });
    });
    // diff capture handles both updates
    // await this._applyToFashionPreferences(userId, { categories, attributes, colors, sizes, occasions, materials, fits });
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

  static async _applyToFashionPreferences(userId, { categories = [], attributes = [], colors = [], sizes = [], occasions = [], materials = [], fits = [] }) {
    if (!userId) return;
    try {
      const current = await PreferencesService.getPreferences(userId);
      const preferredCategories = Array.from(new Set([...(current.preferred_categories || []), ...categories].filter(Boolean)));
      const preferredStyles = Array.from(new Set([...(current.preferred_styles || []), ...attributes].filter(Boolean)));

      await PreferencesService.patchPreferences(userId, {
        preferred_categories: preferredCategories,
        preferred_styles: preferredStyles,
        preferred_colors: Array.from(new Set([...(current.preferred_colors || []), ...colors].filter(Boolean))),
        fit_preferences: Array.from(new Set([...(current.fit_preferences || []), ...sizes, ...fits].filter(Boolean))),
        occasions: Array.from(new Set([...(current.occasions || []), ...occasions].filter(Boolean))),
        avoided_materials: Array.from(new Set([...(current.avoided_materials || []), ...materials].filter(Boolean))),
      });
    } catch (error) {
      logger.warn('Failed to update fashion preferences from chat', error.message);
    }
  }
}

module.exports = ChatPreferenceIngestionService;
