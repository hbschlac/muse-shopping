const pool = require('../db/pool');
const logger = require('../utils/logger');
const PreferencesService = require('./preferencesService');
const ChatNormalizationService = require('./chatNormalizationService');
const ChatProfileDiffService = require('./chatProfileDiffService');
const ChatProfileVersionService = require('./chatProfileVersionService');
const StyleProfileService = require('./styleProfileService');
const StyleNormalizer = require('../utils/styleNormalizer');

class ChatPreferenceIngestionService {
  static _decayWeight() {
    return 1.0; // scaffold for time-decay logic
  }
  static async ingestFromIntent({ userId, sessionId, messageId, intent, originalMessage = '' }) {
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
      await this._applyToFashionPreferences(userId, { categories, attributes, colors, sizes, occasions, materials, fits });

      // NEW: Update style profile from chat intent
      await this._applyToStyleProfile(userId, { categories, priceMin, priceMax, originalMessage });
    });

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

  /**
   * Update style profile from chat intent
   * Now infers all 100 dimensions from chat messages
   */
  static async _applyToStyleProfile(userId, { categories = [], priceMin = null, priceMax = null, originalMessage = '' }) {
    if (!userId || !originalMessage) return;

    try {
      // Extract style signals from the original message
      const styleSignals = StyleNormalizer.extractStyleSignals({}, originalMessage);

      // Map price range to price tier
      let priceTier = null;
      if (priceMin !== null || priceMax !== null) {
        const avgPrice = ((priceMin || 0) + (priceMax || 999999)) / 2;
        if (avgPrice < 5000) priceTier = 'budget'; // < $50
        else if (avgPrice < 15000) priceTier = 'mid'; // $50-$150
        else if (avgPrice < 50000) priceTier = 'premium'; // $150-$500
        else priceTier = 'luxury'; // $500+
      }

      // Map categories to category_focus (pick first matched category)
      const categoryFocus = styleSignals.categories[0] || categories[0] || null;

      // NEW: Infer 100D metadata from chat message text
      const inferredMetadata = this._inferMetadataFromMessage(originalMessage, priceTier, categoryFocus);

      // Update style profile for each detected style archetype
      for (const styleArchetype of styleSignals.styles) {
        await StyleProfileService.updateProfile(
          userId,
          'click', // Chat interaction = click event (weight 0.5)
          'product', // Source type
          null, // No specific product ID yet
          {
            style_archetype: styleArchetype,
            price_tier: priceTier,
            category_focus: categoryFocus,
            occasion_tag: styleSignals.occasions[0] || null,
            ...inferredMetadata // Include 100D inferences
          }
        );
      }

      // If no specific styles detected but we have category/price info, still update
      if (styleSignals.styles.length === 0 && (priceTier || categoryFocus)) {
        await StyleProfileService.updateProfile(
          userId,
          'click',
          'product',
          null,
          {
            style_archetype: null,
            price_tier: priceTier,
            category_focus: categoryFocus,
            occasion_tag: styleSignals.occasions[0] || null,
            ...inferredMetadata // Include 100D inferences
          }
        );
      }

      logger.info(`Updated 100D style profile from chat for user ${userId}:`, {
        styles: styleSignals.styles,
        categories: styleSignals.categories,
        priceTier,
        inferences: Object.keys(inferredMetadata).length
      });
    } catch (error) {
      logger.warn('Failed to update style profile from chat', error.message);
    }
  }

  /**
   * Infer 100D metadata from chat message
   * Analyzes message text to populate dimensions 17-100
   */
  static _inferMetadataFromMessage(message, priceTier, categoryFocus) {
    const metadata = {};
    const lowerMessage = message.toLowerCase();

    // CATEGORY 17-28: Body & Fit Intelligence
    if (lowerMessage.match(/petite|short/i)) metadata.body_type_hint = 'petite';
    if (lowerMessage.match(/tall|long/i)) metadata.body_type_hint = 'tall';
    if (lowerMessage.match(/plus size|curvy/i)) metadata.body_type_hint = 'plus_size';
    if (lowerMessage.match(/comfort|cozy|soft|relaxed/i)) metadata.comfort_priority_hint = 'comfort_first';

    // CATEGORY 29-38: Lifestyle & Context
    if (lowerMessage.match(/work|office|professional|business/i)) metadata.work_environment_hint = 'corporate';
    if (lowerMessage.match(/work from home|remote|wfh/i)) metadata.work_environment_hint = 'remote';
    if (lowerMessage.match(/gym|workout|exercise|fitness/i)) metadata.activity_level_hint = 'highly_active';
    if (lowerMessage.match(/travel|trip|vacation|packing/i)) metadata.travel_frequency_hint = 'frequent_traveler';
    if (lowerMessage.match(/mom|parent|kids|baby|toddler/i)) metadata.parenting_status_hint = 'parent_young_kids';
    if (lowerMessage.match(/dog|cat|pet/i)) metadata.pet_ownership_hint = 'dog_owner';
    if (lowerMessage.match(/hot weather|summer|warm climate/i)) metadata.climate_adaptation_hint = 'hot_climate';
    if (lowerMessage.match(/cold weather|winter|snow/i)) metadata.climate_adaptation_hint = 'cold_climate';

    // CATEGORY 39-50: Fashion Psychology
    if (lowerMessage.match(/trending|trendy|latest|new/i)) metadata.trend_adoption_hint = 'early_adopter';
    if (lowerMessage.match(/classic|timeless|traditional/i)) metadata.trend_adoption_hint = 'trend_immune';
    if (lowerMessage.match(/not sure|help me|confused|advice/i)) metadata.style_confidence_hint = 'needs_guidance';
    if (lowerMessage.match(/sale|discount|deal|budget/i)) metadata.sale_strategy_hint = 'discount_hunter';
    if (lowerMessage.match(/quality|investment|lasting|durable/i)) metadata.quality_expectations_hint = 'investment_focused';

    // CATEGORY 51-60: Purchase Behavior
    if (lowerMessage.match(/need it now|urgent|asap|quick/i)) metadata.backorder_tolerance_hint = 'needs_immediate';
    if (lowerMessage.match(/return|exchange|try on/i)) metadata.return_frequency_hint = 'try_before_buy';
    if (lowerMessage.match(/gift|present|birthday/i)) metadata.gift_purchasing_hint = 'occasion_gifter';

    // CATEGORY 71-78: Occasion-Specific
    if (lowerMessage.match(/wedding|formal event|gala|black tie/i)) metadata.evening_wear_hint = 'black_tie';
    if (lowerMessage.match(/date night|dinner|romantic/i)) metadata.date_night_hint = 'romantic_feminine';
    if (lowerMessage.match(/brunch|weekend|casual/i)) metadata.weekend_hint = 'relaxed_comfort';
    if (lowerMessage.match(/beach|resort|pool/i)) metadata.vacation_hint = 'beach_focused';
    if (lowerMessage.match(/airport|plane|flying|travel/i)) metadata.airport_hint = 'comfort_first';

    // CATEGORY 87-92: Quality & Longevity
    if (lowerMessage.match(/sustainable|eco|ethical|organic/i)) {
      metadata.sustainability_hint = 'eco_conscious';
      metadata.quality_expectations_hint = 'quality_over_quantity';
    }
    if (lowerMessage.match(/vintage|secondhand|thrift|used/i)) metadata.vintage_resale_hint = 'vintage_lover';
    if (lowerMessage.match(/machine wash|easy care|low maintenance/i)) metadata.care_requirements_hint = 'machine_wash_only';

    return metadata;
  }
}

module.exports = ChatPreferenceIngestionService;
