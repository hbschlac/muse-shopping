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
          style_tags,
          color_palette,
          primary_material,
          silhouette_type,
          detail_tags,
          pattern_type,
          coverage_level,
          sustainability_tags,
          season_suitability
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
   * Now handles all 100 dimensions
   */
  static calculateLayerUpdates(profile, weight, sourceType, sourceMetadata) {
    const updates = {
      // Original 16 dimensions (1-16)
      style_layers: { ...profile.style_layers },
      price_layers: { ...profile.price_layers },
      category_layers: { ...profile.category_layers },
      occasion_layers: { ...profile.occasion_layers },
      color_palette_layers: { ...profile.color_palette_layers },
      material_layers: { ...profile.material_layers },
      silhouette_layers: { ...profile.silhouette_layers },
      brand_tier_layers: { ...profile.brand_tier_layers },
      motivation_layers: { ...profile.motivation_layers },
      season_layers: { ...profile.season_layers },
      detail_layers: { ...profile.detail_layers },
      coverage_layers: { ...profile.coverage_layers },
      pattern_layers: { ...profile.pattern_layers },
      versatility_layers: { ...profile.versatility_layers },
      sustainability_layers: { ...profile.sustainability_layers },
      loyalty_layers: { ...profile.loyalty_layers },

      // New 84 dimensions (17-100)
      body_type_preference_layers: { ...profile.body_type_preference_layers },
      size_consistency_layers: { ...profile.size_consistency_layers },
      comfort_priority_layers: { ...profile.comfort_priority_layers },
      height_accommodation_layers: { ...profile.height_accommodation_layers },
      sleeve_preference_layers: { ...profile.sleeve_preference_layers },
      neckline_preference_layers: { ...profile.neckline_preference_layers },
      waist_placement_layers: { ...profile.waist_placement_layers },
      leg_opening_layers: { ...profile.leg_opening_layers },
      arm_coverage_layers: { ...profile.arm_coverage_layers },
      torso_length_fit_layers: { ...profile.torso_length_fit_layers },
      rise_preference_layers: { ...profile.rise_preference_layers },
      strap_style_layers: { ...profile.strap_style_layers },
      work_environment_layers: { ...profile.work_environment_layers },
      activity_level_layers: { ...profile.activity_level_layers },
      climate_adaptation_layers: { ...profile.climate_adaptation_layers },
      travel_frequency_layers: { ...profile.travel_frequency_layers },
      social_calendar_layers: { ...profile.social_calendar_layers },
      parenting_status_layers: { ...profile.parenting_status_layers },
      pet_ownership_layers: { ...profile.pet_ownership_layers },
      commute_type_layers: { ...profile.commute_type_layers },
      housing_type_layers: { ...profile.housing_type_layers },
      income_stability_layers: { ...profile.income_stability_layers },
      risk_tolerance_layers: { ...profile.risk_tolerance_layers },
      brand_prestige_sensitivity_layers: { ...profile.brand_prestige_sensitivity_layers },
      trend_adoption_speed_layers: { ...profile.trend_adoption_speed_layers },
      fashion_knowledge_level_layers: { ...profile.fashion_knowledge_level_layers },
      style_confidence_layers: { ...profile.style_confidence_layers },
      decision_making_speed_layers: { ...profile.decision_making_speed_layers },
      fomo_susceptibility_layers: { ...profile.fomo_susceptibility_layers },
      comparison_shopping_behavior_layers: { ...profile.comparison_shopping_behavior_layers },
      review_dependency_layers: { ...profile.review_dependency_layers },
      influencer_influence_level_layers: { ...profile.influencer_influence_level_layers },
      editorial_trust_layers: { ...profile.editorial_trust_layers },
      visual_shopping_style_layers: { ...profile.visual_shopping_style_layers },
      replenishment_cycle_layers: { ...profile.replenishment_cycle_layers },
      wardrobe_completion_strategy_layers: { ...profile.wardrobe_completion_strategy_layers },
      sale_strategy_layers: { ...profile.sale_strategy_layers },
      pre_ordering_behavior_layers: { ...profile.pre_ordering_behavior_layers },
      backorder_tolerance_layers: { ...profile.backorder_tolerance_layers },
      cart_abandonment_pattern_layers: { ...profile.cart_abandonment_pattern_layers },
      return_frequency_layers: { ...profile.return_frequency_layers },
      gift_purchasing_layers: { ...profile.gift_purchasing_layers },
      bundle_buying_layers: { ...profile.bundle_buying_layers },
      payment_method_preference_layers: { ...profile.payment_method_preference_layers },
      texture_preference_layers: { ...profile.texture_preference_layers },
      embellishment_tolerance_layers: { ...profile.embellishment_tolerance_layers },
      hardware_finish_layers: { ...profile.hardware_finish_layers },
      transparency_preference_layers: { ...profile.transparency_preference_layers },
      layering_behavior_layers: { ...profile.layering_behavior_layers },
      proportion_play_layers: { ...profile.proportion_play_layers },
      color_contrast_layers: { ...profile.color_contrast_layers },
      print_mixing_layers: { ...profile.print_mixing_layers },
      shine_level_layers: { ...profile.shine_level_layers },
      structure_vs_drape_layers: { ...profile.structure_vs_drape_layers },
      work_style_depth_layers: { ...profile.work_style_depth_layers },
      evening_wear_style_layers: { ...profile.evening_wear_style_layers },
      vacation_style_layers: { ...profile.vacation_style_layers },
      athleisure_purpose_layers: { ...profile.athleisure_purpose_layers },
      weekend_style_layers: { ...profile.weekend_style_layers },
      date_night_style_layers: { ...profile.date_night_style_layers },
      brunch_style_layers: { ...profile.brunch_style_layers },
      airport_style_layers: { ...profile.airport_style_layers },
      brand_discovery_method_layers: { ...profile.brand_discovery_method_layers },
      brand_switching_tendency_layers: { ...profile.brand_switching_tendency_layers },
      emerging_brand_openness_layers: { ...profile.emerging_brand_openness_layers },
      dtc_affinity_layers: { ...profile.dtc_affinity_layers },
      designer_collaboration_interest_layers: { ...profile.designer_collaboration_interest_layers },
      vintage_resale_behavior_layers: { ...profile.vintage_resale_behavior_layers },
      sample_sale_behavior_layers: { ...profile.sample_sale_behavior_layers },
      subscription_box_interest_layers: { ...profile.subscription_box_interest_layers },
      quality_expectations_layers: { ...profile.quality_expectations_layers },
      care_requirements_tolerance_layers: { ...profile.care_requirements_tolerance_layers },
      trend_longevity_preference_layers: { ...profile.trend_longevity_preference_layers },
      wear_frequency_expectation_layers: { ...profile.wear_frequency_expectation_layers },
      damage_tolerance_layers: { ...profile.damage_tolerance_layers },
      alteration_willingness_layers: { ...profile.alteration_willingness_layers },
      cultural_style_influence_layers: { ...profile.cultural_style_influence_layers },
      generational_style_layers: { ...profile.generational_style_layers },
      social_media_presence_layers: { ...profile.social_media_presence_layers },
      community_engagement_layers: { ...profile.community_engagement_layers },
      style_tribe_affiliation_layers: { ...profile.style_tribe_affiliation_layers },
      fashion_week_interest_layers: { ...profile.fashion_week_interest_layers },
      celebrity_style_influence_layers: { ...profile.celebrity_style_influence_layers },
      regional_style_identity_layers: { ...profile.regional_style_identity_layers },

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

      // NEW DIMENSIONS (5-16)

      // Update color palette layers
      if (sourceMetadata.color_palette) {
        const color = sourceMetadata.color_palette;
        updates.color_palette_layers[color] = (updates.color_palette_layers[color] || 0) + weight;
      }

      // Update material layers
      if (sourceMetadata.primary_material) {
        const material = sourceMetadata.primary_material;
        updates.material_layers[material] = (updates.material_layers[material] || 0) + weight;
      }

      // Update silhouette layers
      if (sourceMetadata.silhouette_type) {
        const silhouette = sourceMetadata.silhouette_type;
        updates.silhouette_layers[silhouette] = (updates.silhouette_layers[silhouette] || 0) + weight;
      }

      // Update detail layers from detail tags
      if (sourceMetadata.detail_tags && Array.isArray(sourceMetadata.detail_tags)) {
        sourceMetadata.detail_tags.forEach(detail => {
          updates.detail_layers[detail] = (updates.detail_layers[detail] || 0) + (weight * 0.7);
        });
      }

      // Update pattern layers
      if (sourceMetadata.pattern_type) {
        const pattern = sourceMetadata.pattern_type;
        updates.pattern_layers[pattern] = (updates.pattern_layers[pattern] || 0) + weight;
      }

      // Update coverage layers
      if (sourceMetadata.coverage_level) {
        const coverage = sourceMetadata.coverage_level;
        updates.coverage_layers[coverage] = (updates.coverage_layers[coverage] || 0) + weight;
      }

      // Update sustainability layers from tags
      if (sourceMetadata.sustainability_tags && Array.isArray(sourceMetadata.sustainability_tags)) {
        sourceMetadata.sustainability_tags.forEach(tag => {
          updates.sustainability_layers[tag] = (updates.sustainability_layers[tag] || 0) + (weight * 0.8);
        });
      }

      // Update season layers from season suitability
      if (sourceMetadata.season_suitability && Array.isArray(sourceMetadata.season_suitability)) {
        sourceMetadata.season_suitability.forEach(season => {
          updates.season_layers[season] = (updates.season_layers[season] || 0) + (weight * 0.6);
        });
      }

      // Infer shopping motivation from event type
      if (weight === EVENT_WEIGHTS.purchase) {
        // Direct purchase = high intent
        updates.motivation_layers.investment_piece = (updates.motivation_layers.investment_piece || 0) + 0.5;
        updates.commerce_intent_delta = 0.2;
        updates.decision_making_speed_layers.quick_decider = (updates.decision_making_speed_layers.quick_decider || 0) + 0.3;
      } else if (weight === EVENT_WEIGHTS.save) {
        // Save for later = consideration
        updates.motivation_layers.wardrobe_staple = (updates.motivation_layers.wardrobe_staple || 0) + 0.3;
        updates.decision_making_speed_layers.researcher = (updates.decision_making_speed_layers.researcher || 0) + 0.2;
      } else if (weight === EVENT_WEIGHTS.click) {
        // Quick click = browsing/impulse
        updates.motivation_layers.impulse = (updates.motivation_layers.impulse || 0) + 0.2;
        updates.decision_making_speed_layers.impulse_buyer = (updates.decision_making_speed_layers.impulse_buyer || 0) + 0.1;
      }

      // NEW DIMENSIONS INFERENCE (17-100)

      // Behavioral inference from purchase patterns
      if (weight === EVENT_WEIGHTS.purchase) {
        updates.replenishment_cycle_layers.as_needed = (updates.replenishment_cycle_layers.as_needed || 0) + 0.2;
        updates.bundle_buying_layers.single_item_buyer = (updates.bundle_buying_layers.single_item_buyer || 0) + 0.3;
      }

      // Infer quality expectations from price tier
      if (sourceMetadata.price_tier === 'luxury') {
        updates.quality_expectations_layers.luxury_quality_only = (updates.quality_expectations_layers.luxury_quality_only || 0) + 0.4;
        updates.trend_longevity_preference_layers.timeless_only = (updates.trend_longevity_preference_layers.timeless_only || 0) + 0.3;
      } else if (sourceMetadata.price_tier === 'budget') {
        updates.quality_expectations_layers.fast_fashion_acceptable = (updates.quality_expectations_layers.fast_fashion_acceptable || 0) + 0.3;
        updates.sale_strategy_layers.discount_hunter = (updates.sale_strategy_layers.discount_hunter || 0) + 0.2;
      }

      // Infer work style from category
      if (sourceMetadata.category === 'Workwear') {
        updates.work_style_depth_layers.suiting_focused = (updates.work_style_depth_layers.suiting_focused || 0) + 0.4;
        updates.work_environment_layers.corporate = (updates.work_environment_layers.corporate || 0) + 0.3;
      }

      // Infer athleisure purpose from activewear
      if (sourceMetadata.category === 'Activewear' || sourceMetadata.category === 'Athletic & Sneakers') {
        updates.athleisure_purpose_layers.lifestyle_athleisure = (updates.athleisure_purpose_layers.lifestyle_athleisure || 0) + 0.3;
        updates.activity_level_layers.moderately_active = (updates.activity_level_layers.moderately_active || 0) + 0.2;
      }

      // Infer comfort priority from materials
      if (sourceMetadata.primary_material === 'cotton' || sourceMetadata.primary_material === 'knit') {
        updates.comfort_priority_layers.comfort_first = (updates.comfort_priority_layers.comfort_first || 0) + 0.2;
      }

      // Infer style confidence from bold choices
      if (sourceMetadata.pattern_type === 'animal_print' || sourceMetadata.color_palette === 'brights') {
        updates.style_confidence_layers.highly_confident = (updates.style_confidence_layers.highly_confident || 0) + 0.3;
        updates.risk_tolerance_layers.bold_experimenter = (updates.risk_tolerance_layers.bold_experimenter || 0) + 0.2;
      }

      // Infer sustainability values
      if (sourceMetadata.sustainability_tags && sourceMetadata.sustainability_tags.length > 0) {
        updates.quality_expectations_layers.quality_over_quantity = (updates.quality_expectations_layers.quality_over_quantity || 0) + 0.4;
        updates.trend_longevity_preference_layers.timeless_only = (updates.trend_longevity_preference_layers.timeless_only || 0) + 0.3;
      }
    }

    // Infer from influencer source
    if (sourceType === 'influencer' && weight === EVENT_WEIGHTS.follow) {
      updates.influencer_influence_level_layers.highly_influenced = (updates.influencer_influence_level_layers.highly_influenced || 0) + 0.5;
      updates.brand_discovery_method_layers.influencer_discovery = (updates.brand_discovery_method_layers.influencer_discovery || 0) + 0.4;
      updates.social_media_presence_layers.highly_active = (updates.social_media_presence_layers.highly_active || 0) + 0.3;
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
   * Now updates all 100 dimensions
   */
  static async applyLayerUpdates(userId, updates, weight, sourceMetadata) {
    try {
      // Calculate new confidence based on total_events
      // Formula: confidence = min(1, log10(total_events + 1) / 2)
      const result = await pool.query(
        `UPDATE style_profiles
         SET
           style_layers = $1::jsonb, price_layers = $2::jsonb, category_layers = $3::jsonb, occasion_layers = $4::jsonb,
           color_palette_layers = $5::jsonb, material_layers = $6::jsonb, silhouette_layers = $7::jsonb, brand_tier_layers = $8::jsonb,
           motivation_layers = $9::jsonb, season_layers = $10::jsonb, detail_layers = $11::jsonb, coverage_layers = $12::jsonb,
           pattern_layers = $13::jsonb, versatility_layers = $14::jsonb, sustainability_layers = $15::jsonb, loyalty_layers = $16::jsonb,
           body_type_preference_layers = $17::jsonb, size_consistency_layers = $18::jsonb, comfort_priority_layers = $19::jsonb, height_accommodation_layers = $20::jsonb,
           sleeve_preference_layers = $21::jsonb, neckline_preference_layers = $22::jsonb, waist_placement_layers = $23::jsonb, leg_opening_layers = $24::jsonb,
           arm_coverage_layers = $25::jsonb, torso_length_fit_layers = $26::jsonb, rise_preference_layers = $27::jsonb, strap_style_layers = $28::jsonb,
           work_environment_layers = $29::jsonb, activity_level_layers = $30::jsonb, climate_adaptation_layers = $31::jsonb, travel_frequency_layers = $32::jsonb,
           social_calendar_layers = $33::jsonb, parenting_status_layers = $34::jsonb, pet_ownership_layers = $35::jsonb, commute_type_layers = $36::jsonb,
           housing_type_layers = $37::jsonb, income_stability_layers = $38::jsonb, risk_tolerance_layers = $39::jsonb, brand_prestige_sensitivity_layers = $40::jsonb,
           trend_adoption_speed_layers = $41::jsonb, fashion_knowledge_level_layers = $42::jsonb, style_confidence_layers = $43::jsonb, decision_making_speed_layers = $44::jsonb,
           fomo_susceptibility_layers = $45::jsonb, comparison_shopping_behavior_layers = $46::jsonb, review_dependency_layers = $47::jsonb, influencer_influence_level_layers = $48::jsonb,
           editorial_trust_layers = $49::jsonb, visual_shopping_style_layers = $50::jsonb, replenishment_cycle_layers = $51::jsonb, wardrobe_completion_strategy_layers = $52::jsonb,
           sale_strategy_layers = $53::jsonb, pre_ordering_behavior_layers = $54::jsonb, backorder_tolerance_layers = $55::jsonb, cart_abandonment_pattern_layers = $56::jsonb,
           return_frequency_layers = $57::jsonb, gift_purchasing_layers = $58::jsonb, bundle_buying_layers = $59::jsonb, payment_method_preference_layers = $60::jsonb,
           texture_preference_layers = $61::jsonb, embellishment_tolerance_layers = $62::jsonb, hardware_finish_layers = $63::jsonb, transparency_preference_layers = $64::jsonb,
           layering_behavior_layers = $65::jsonb, proportion_play_layers = $66::jsonb, color_contrast_layers = $67::jsonb, print_mixing_layers = $68::jsonb,
           shine_level_layers = $69::jsonb, structure_vs_drape_layers = $70::jsonb, work_style_depth_layers = $71::jsonb, evening_wear_style_layers = $72::jsonb,
           vacation_style_layers = $73::jsonb, athleisure_purpose_layers = $74::jsonb, weekend_style_layers = $75::jsonb, date_night_style_layers = $76::jsonb,
           brunch_style_layers = $77::jsonb, airport_style_layers = $78::jsonb, brand_discovery_method_layers = $79::jsonb, brand_switching_tendency_layers = $80::jsonb,
           emerging_brand_openness_layers = $81::jsonb, dtc_affinity_layers = $82::jsonb, designer_collaboration_interest_layers = $83::jsonb, vintage_resale_behavior_layers = $84::jsonb,
           sample_sale_behavior_layers = $85::jsonb, subscription_box_interest_layers = $86::jsonb, quality_expectations_layers = $87::jsonb, care_requirements_tolerance_layers = $88::jsonb,
           trend_longevity_preference_layers = $89::jsonb, wear_frequency_expectation_layers = $90::jsonb, damage_tolerance_layers = $91::jsonb, alteration_willingness_layers = $92::jsonb,
           cultural_style_influence_layers = $93::jsonb, generational_style_layers = $94::jsonb, social_media_presence_layers = $95::jsonb, community_engagement_layers = $96::jsonb,
           style_tribe_affiliation_layers = $97::jsonb, fashion_week_interest_layers = $98::jsonb, celebrity_style_influence_layers = $99::jsonb, regional_style_identity_layers = $100::jsonb,
           commerce_intent = commerce_intent + $101,
           total_events = total_events + 1,
           confidence = LEAST(1.0, LOG(10, total_events + 2) / 2.0),
           last_event_at = CURRENT_TIMESTAMP
         WHERE user_id = $102
         RETURNING *`,
        [
          JSON.stringify(updates.style_layers), JSON.stringify(updates.price_layers), JSON.stringify(updates.category_layers), JSON.stringify(updates.occasion_layers),
          JSON.stringify(updates.color_palette_layers), JSON.stringify(updates.material_layers), JSON.stringify(updates.silhouette_layers), JSON.stringify(updates.brand_tier_layers),
          JSON.stringify(updates.motivation_layers), JSON.stringify(updates.season_layers), JSON.stringify(updates.detail_layers), JSON.stringify(updates.coverage_layers),
          JSON.stringify(updates.pattern_layers), JSON.stringify(updates.versatility_layers), JSON.stringify(updates.sustainability_layers), JSON.stringify(updates.loyalty_layers),
          JSON.stringify(updates.body_type_preference_layers), JSON.stringify(updates.size_consistency_layers), JSON.stringify(updates.comfort_priority_layers), JSON.stringify(updates.height_accommodation_layers),
          JSON.stringify(updates.sleeve_preference_layers), JSON.stringify(updates.neckline_preference_layers), JSON.stringify(updates.waist_placement_layers), JSON.stringify(updates.leg_opening_layers),
          JSON.stringify(updates.arm_coverage_layers), JSON.stringify(updates.torso_length_fit_layers), JSON.stringify(updates.rise_preference_layers), JSON.stringify(updates.strap_style_layers),
          JSON.stringify(updates.work_environment_layers), JSON.stringify(updates.activity_level_layers), JSON.stringify(updates.climate_adaptation_layers), JSON.stringify(updates.travel_frequency_layers),
          JSON.stringify(updates.social_calendar_layers), JSON.stringify(updates.parenting_status_layers), JSON.stringify(updates.pet_ownership_layers), JSON.stringify(updates.commute_type_layers),
          JSON.stringify(updates.housing_type_layers), JSON.stringify(updates.income_stability_layers), JSON.stringify(updates.risk_tolerance_layers), JSON.stringify(updates.brand_prestige_sensitivity_layers),
          JSON.stringify(updates.trend_adoption_speed_layers), JSON.stringify(updates.fashion_knowledge_level_layers), JSON.stringify(updates.style_confidence_layers), JSON.stringify(updates.decision_making_speed_layers),
          JSON.stringify(updates.fomo_susceptibility_layers), JSON.stringify(updates.comparison_shopping_behavior_layers), JSON.stringify(updates.review_dependency_layers), JSON.stringify(updates.influencer_influence_level_layers),
          JSON.stringify(updates.editorial_trust_layers), JSON.stringify(updates.visual_shopping_style_layers), JSON.stringify(updates.replenishment_cycle_layers), JSON.stringify(updates.wardrobe_completion_strategy_layers),
          JSON.stringify(updates.sale_strategy_layers), JSON.stringify(updates.pre_ordering_behavior_layers), JSON.stringify(updates.backorder_tolerance_layers), JSON.stringify(updates.cart_abandonment_pattern_layers),
          JSON.stringify(updates.return_frequency_layers), JSON.stringify(updates.gift_purchasing_layers), JSON.stringify(updates.bundle_buying_layers), JSON.stringify(updates.payment_method_preference_layers),
          JSON.stringify(updates.texture_preference_layers), JSON.stringify(updates.embellishment_tolerance_layers), JSON.stringify(updates.hardware_finish_layers), JSON.stringify(updates.transparency_preference_layers),
          JSON.stringify(updates.layering_behavior_layers), JSON.stringify(updates.proportion_play_layers), JSON.stringify(updates.color_contrast_layers), JSON.stringify(updates.print_mixing_layers),
          JSON.stringify(updates.shine_level_layers), JSON.stringify(updates.structure_vs_drape_layers), JSON.stringify(updates.work_style_depth_layers), JSON.stringify(updates.evening_wear_style_layers),
          JSON.stringify(updates.vacation_style_layers), JSON.stringify(updates.athleisure_purpose_layers), JSON.stringify(updates.weekend_style_layers), JSON.stringify(updates.date_night_style_layers),
          JSON.stringify(updates.brunch_style_layers), JSON.stringify(updates.airport_style_layers), JSON.stringify(updates.brand_discovery_method_layers), JSON.stringify(updates.brand_switching_tendency_layers),
          JSON.stringify(updates.emerging_brand_openness_layers), JSON.stringify(updates.dtc_affinity_layers), JSON.stringify(updates.designer_collaboration_interest_layers), JSON.stringify(updates.vintage_resale_behavior_layers),
          JSON.stringify(updates.sample_sale_behavior_layers), JSON.stringify(updates.subscription_box_interest_layers), JSON.stringify(updates.quality_expectations_layers), JSON.stringify(updates.care_requirements_tolerance_layers),
          JSON.stringify(updates.trend_longevity_preference_layers), JSON.stringify(updates.wear_frequency_expectation_layers), JSON.stringify(updates.damage_tolerance_layers), JSON.stringify(updates.alteration_willingness_layers),
          JSON.stringify(updates.cultural_style_influence_layers), JSON.stringify(updates.generational_style_layers), JSON.stringify(updates.social_media_presence_layers), JSON.stringify(updates.community_engagement_layers),
          JSON.stringify(updates.style_tribe_affiliation_layers), JSON.stringify(updates.fashion_week_interest_layers), JSON.stringify(updates.celebrity_style_influence_layers), JSON.stringify(updates.regional_style_identity_layers),
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
   * Boost feed modules based on user's 100D style profile
   * Ranks modules by how well they match customer preferences
   */
  static async boostModulesForUser(userId, modules) {
    try {
      const preferences = await this.getTopPreferences(userId);

      // Only boost if we have confidence
      if (preferences.confidence < 0.3) {
        return modules; // Not enough data yet
      }

      const boostedModules = modules.map(module => {
        let boost = 1.0;

        // Boost by brand style match
        if (module.brand_aesthetic && preferences.top_styles) {
          const styleMatch = preferences.top_styles.some(style =>
            module.brand_aesthetic.includes(style.name)
          );
          if (styleMatch) boost *= 1.3;
        }

        // Boost by category focus
        if (module.category_focus) {
          const categoryMatch = preferences.top_categories.some(cat =>
            cat.name === module.category_focus
          );
          if (categoryMatch) boost *= 1.2;
        }

        // Boost by price tier
        if (module.brand_price_tier === preferences.primary_price_tier?.name) {
          boost *= 1.15;
        }

        return {
          ...module,
          profile_boost: boost,
          boosted_score: (module.score || 1.0) * boost
        };
      });

      // Re-sort by boosted score
      return boostedModules.sort((a, b) => b.boosted_score - a.boosted_score);
    } catch (error) {
      logger.error('Error boosting modules:', error);
      return modules; // Return unboosted on error
    }
  }

  /**
   * Rank stories based on user's 100D style profile
   * Prioritizes stories from brands that match customer preferences
   */
  static async rankStoriesForUser(userId, stories) {
    try {
      const preferences = await this.getTopPreferences(userId);

      if (preferences.confidence < 0.3) {
        return stories;
      }

      const rankedStories = stories.map(story => {
        let boost = 1.0;

        // Boost by brand aesthetic
        if (story.brand_aesthetic) {
          const styleMatch = preferences.top_styles.some(style =>
            story.brand_aesthetic.includes(style.name)
          );
          if (styleMatch) boost *= 1.4;
        }

        // Boost by recent interactions
        if (story.recent_interaction) boost *= 1.2;

        return {
          ...story,
          profile_boost: boost,
          boosted_score: (story.score || 1.0) * boost
        };
      });

      return rankedStories.sort((a, b) => b.boosted_score - a.boosted_score);
    } catch (error) {
      logger.error('Error ranking stories:', error);
      return stories;
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
