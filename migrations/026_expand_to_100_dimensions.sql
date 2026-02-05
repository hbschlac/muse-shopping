-- Migration 026: Expand Style Profile from 16 to 100 Dimensions
-- Creates thousands of unique customer profiles for hyper-personalization
-- Created: 2026-02-05

-- ============================================================================
-- 100-DIMENSIONAL STYLE PROFILE SYSTEM
-- Adds 84 new dimensions (17-100) to existing 16 dimensions
-- ============================================================================

-- ============================================================================
-- CATEGORY A: Body & Fit Intelligence (12 dimensions: 17-28)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 17: Body Type Preference
  ADD COLUMN IF NOT EXISTS body_type_preference_layers JSONB DEFAULT '{
    "petite": 0, "tall": 0, "plus_size": 0, "athletic": 0,
    "curvy": 0, "straight": 0, "hourglass": 0, "pear_shaped": 0
  }'::jsonb,

  -- DIMENSION 18: Size Consistency
  ADD COLUMN IF NOT EXISTS size_consistency_layers JSONB DEFAULT '{
    "runs_small": 0, "true_to_size": 0, "runs_large": 0,
    "size_up": 0, "size_down": 0
  }'::jsonb,

  -- DIMENSION 19: Comfort Priority
  ADD COLUMN IF NOT EXISTS comfort_priority_layers JSONB DEFAULT '{
    "comfort_first": 0, "style_over_comfort": 0, "balanced": 0,
    "breathable_fabrics": 0, "stretchy_preferred": 0
  }'::jsonb,

  -- DIMENSION 20: Height Accommodation
  ADD COLUMN IF NOT EXISTS height_accommodation_layers JSONB DEFAULT '{
    "petite_friendly": 0, "regular": 0, "tall_specific": 0,
    "adjustable_preferred": 0
  }'::jsonb,

  -- DIMENSION 21: Sleeve Preference
  ADD COLUMN IF NOT EXISTS sleeve_preference_layers JSONB DEFAULT '{
    "sleeveless": 0, "short_sleeve": 0, "three_quarter": 0,
    "long_sleeve": 0, "adjustable": 0
  }'::jsonb,

  -- DIMENSION 22: Neckline Preference
  ADD COLUMN IF NOT EXISTS neckline_preference_layers JSONB DEFAULT '{
    "crew_neck": 0, "v_neck": 0, "scoop_neck": 0,
    "high_neck": 0, "off_shoulder": 0, "strapless": 0
  }'::jsonb,

  -- DIMENSION 23: Waist Placement
  ADD COLUMN IF NOT EXISTS waist_placement_layers JSONB DEFAULT '{
    "high_waist": 0, "natural_waist": 0, "low_rise": 0,
    "drop_waist": 0, "empire": 0
  }'::jsonb,

  -- DIMENSION 24: Leg Opening
  ADD COLUMN IF NOT EXISTS leg_opening_layers JSONB DEFAULT '{
    "skinny": 0, "straight": 0, "wide_leg": 0,
    "bootcut": 0, "flare": 0, "tapered": 0
  }'::jsonb,

  -- DIMENSION 25: Arm Coverage
  ADD COLUMN IF NOT EXISTS arm_coverage_layers JSONB DEFAULT '{
    "full_coverage": 0, "three_quarter": 0, "cap_sleeve": 0,
    "sleeveless": 0, "cut_in": 0
  }'::jsonb,

  -- DIMENSION 26: Torso Length Fit
  ADD COLUMN IF NOT EXISTS torso_length_fit_layers JSONB DEFAULT '{
    "cropped_preferred": 0, "regular_length": 0,
    "tunic_length": 0, "longline": 0
  }'::jsonb,

  -- DIMENSION 27: Rise Preference (Pants)
  ADD COLUMN IF NOT EXISTS rise_preference_layers JSONB DEFAULT '{
    "low_rise": 0, "mid_rise": 0, "high_rise": 0, "ultra_high_rise": 0
  }'::jsonb,

  -- DIMENSION 28: Strap Style
  ADD COLUMN IF NOT EXISTS strap_style_layers JSONB DEFAULT '{
    "thin_straps": 0, "wide_straps": 0, "strapless": 0,
    "halter": 0, "one_shoulder": 0, "off_shoulder": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY B: Lifestyle & Context (10 dimensions: 29-38)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 29: Work Environment
  ADD COLUMN IF NOT EXISTS work_environment_layers JSONB DEFAULT '{
    "corporate": 0, "business_casual": 0, "creative": 0,
    "remote": 0, "casual": 0, "client_facing": 0
  }'::jsonb,

  -- DIMENSION 30: Activity Level
  ADD COLUMN IF NOT EXISTS activity_level_layers JSONB DEFAULT '{
    "highly_active": 0, "moderately_active": 0, "sedentary": 0,
    "athlete": 0, "yoga_focused": 0
  }'::jsonb,

  -- DIMENSION 31: Climate Adaptation
  ADD COLUMN IF NOT EXISTS climate_adaptation_layers JSONB DEFAULT '{
    "hot_climate": 0, "cold_climate": 0, "variable": 0,
    "humid": 0, "dry": 0, "coastal": 0
  }'::jsonb,

  -- DIMENSION 32: Travel Frequency
  ADD COLUMN IF NOT EXISTS travel_frequency_layers JSONB DEFAULT '{
    "frequent_traveler": 0, "occasional": 0, "rarely": 0,
    "business_traveler": 0, "vacation_focused": 0
  }'::jsonb,

  -- DIMENSION 33: Social Calendar
  ADD COLUMN IF NOT EXISTS social_calendar_layers JSONB DEFAULT '{
    "event_heavy": 0, "weekend_social": 0, "low_key": 0,
    "networking_focused": 0
  }'::jsonb,

  -- DIMENSION 34: Parenting Status
  ADD COLUMN IF NOT EXISTS parenting_status_layers JSONB DEFAULT '{
    "parent_young_kids": 0, "parent_older_kids": 0, "expecting": 0,
    "no_kids": 0, "caretaker": 0
  }'::jsonb,

  -- DIMENSION 35: Pet Ownership
  ADD COLUMN IF NOT EXISTS pet_ownership_layers JSONB DEFAULT '{
    "dog_owner": 0, "cat_owner": 0, "multiple_pets": 0, "no_pets": 0
  }'::jsonb,

  -- DIMENSION 36: Commute Type
  ADD COLUMN IF NOT EXISTS commute_type_layers JSONB DEFAULT '{
    "car_commute": 0, "public_transit": 0, "bike_commute": 0,
    "walk": 0, "remote": 0
  }'::jsonb,

  -- DIMENSION 37: Housing Type
  ADD COLUMN IF NOT EXISTS housing_type_layers JSONB DEFAULT '{
    "urban_apartment": 0, "suburban_house": 0, "rural": 0,
    "shared_living": 0, "compact_space": 0
  }'::jsonb,

  -- DIMENSION 38: Income Stability
  ADD COLUMN IF NOT EXISTS income_stability_layers JSONB DEFAULT '{
    "stable_income": 0, "variable_income": 0, "seasonal_income": 0,
    "student": 0, "retired": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY C: Fashion Psychology (12 dimensions: 39-50)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 39: Risk Tolerance (Style)
  ADD COLUMN IF NOT EXISTS risk_tolerance_layers JSONB DEFAULT '{
    "risk_averse": 0, "calculated_risks": 0, "bold_experimenter": 0,
    "trendsetter": 0
  }'::jsonb,

  -- DIMENSION 40: Brand Prestige Sensitivity
  ADD COLUMN IF NOT EXISTS brand_prestige_sensitivity_layers JSONB DEFAULT '{
    "logo_driven": 0, "logo_averse": 0, "subtle_branding": 0,
    "brand_agnostic": 0
  }'::jsonb,

  -- DIMENSION 41: Trend Adoption Speed
  ADD COLUMN IF NOT EXISTS trend_adoption_speed_layers JSONB DEFAULT '{
    "early_adopter": 0, "early_majority": 0, "late_majority": 0,
    "laggard": 0, "trend_immune": 0
  }'::jsonb,

  -- DIMENSION 42: Fashion Knowledge Level
  ADD COLUMN IF NOT EXISTS fashion_knowledge_level_layers JSONB DEFAULT '{
    "novice": 0, "intermediate": 0, "advanced": 0,
    "expert": 0, "industry_insider": 0
  }'::jsonb,

  -- DIMENSION 43: Style Confidence
  ADD COLUMN IF NOT EXISTS style_confidence_layers JSONB DEFAULT '{
    "highly_confident": 0, "developing": 0, "needs_guidance": 0,
    "experimenting": 0
  }'::jsonb,

  -- DIMENSION 44: Decision Making Speed
  ADD COLUMN IF NOT EXISTS decision_making_speed_layers JSONB DEFAULT '{
    "impulse_buyer": 0, "quick_decider": 0, "researcher": 0,
    "slow_consideration": 0
  }'::jsonb,

  -- DIMENSION 45: FOMO Susceptibility
  ADD COLUMN IF NOT EXISTS fomo_susceptibility_layers JSONB DEFAULT '{
    "highly_influenced": 0, "moderately": 0, "low": 0, "immune_to_fomo": 0
  }'::jsonb,

  -- DIMENSION 46: Comparison Shopping Behavior
  ADD COLUMN IF NOT EXISTS comparison_shopping_behavior_layers JSONB DEFAULT '{
    "single_source": 0, "compare_2_3": 0, "extensive_research": 0,
    "price_tracker": 0
  }'::jsonb,

  -- DIMENSION 47: Review Dependency
  ADD COLUMN IF NOT EXISTS review_dependency_layers JSONB DEFAULT '{
    "review_required": 0, "review_helpful": 0, "rarely_checks": 0,
    "ignores_reviews": 0
  }'::jsonb,

  -- DIMENSION 48: Influencer Influence Level
  ADD COLUMN IF NOT EXISTS influencer_influence_level_layers JSONB DEFAULT '{
    "highly_influenced": 0, "moderately": 0, "minimally": 0,
    "influencer_immune": 0
  }'::jsonb,

  -- DIMENSION 49: Editorial Trust
  ADD COLUMN IF NOT EXISTS editorial_trust_layers JSONB DEFAULT '{
    "trusts_editors": 0, "prefers_user_content": 0, "skeptical": 0,
    "independent": 0
  }'::jsonb,

  -- DIMENSION 50: Visual Shopping Style
  ADD COLUMN IF NOT EXISTS visual_shopping_style_layers JSONB DEFAULT '{
    "image_driven": 0, "detail_reader": 0, "video_preferred": 0,
    "mixed_media": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY D: Purchase Behavior Patterns (10 dimensions: 51-60)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 51: Replenishment Cycle
  ADD COLUMN IF NOT EXISTS replenishment_cycle_layers JSONB DEFAULT '{
    "frequent_refresher": 0, "seasonal_buyer": 0, "annual_overhaul": 0,
    "as_needed": 0
  }'::jsonb,

  -- DIMENSION 52: Wardrobe Completion Strategy
  ADD COLUMN IF NOT EXISTS wardrobe_completion_strategy_layers JSONB DEFAULT '{
    "outfit_builder": 0, "single_statement_pieces": 0,
    "complete_looks": 0, "mix_matcher": 0
  }'::jsonb,

  -- DIMENSION 53: Sale Strategy
  ADD COLUMN IF NOT EXISTS sale_strategy_layers JSONB DEFAULT '{
    "sale_exclusive": 0, "sale_opportunist": 0, "full_price_buyer": 0,
    "discount_hunter": 0
  }'::jsonb,

  -- DIMENSION 54: Pre-ordering Behavior
  ADD COLUMN IF NOT EXISTS pre_ordering_behavior_layers JSONB DEFAULT '{
    "pre_order_enthusiast": 0, "waits_for_release": 0,
    "waits_for_reviews": 0, "never_pre_orders": 0
  }'::jsonb,

  -- DIMENSION 55: Backorder Tolerance
  ADD COLUMN IF NOT EXISTS backorder_tolerance_layers JSONB DEFAULT '{
    "willing_to_wait": 0, "needs_immediate": 0, "flexible": 0,
    "never_backordered": 0
  }'::jsonb,

  -- DIMENSION 56: Cart Abandonment Pattern
  ADD COLUMN IF NOT EXISTS cart_abandonment_pattern_layers JSONB DEFAULT '{
    "frequent_abandoner": 0, "saves_for_later": 0, "buys_immediately": 0,
    "needs_reminder": 0
  }'::jsonb,

  -- DIMENSION 57: Return Frequency
  ADD COLUMN IF NOT EXISTS return_frequency_layers JSONB DEFAULT '{
    "rarely_returns": 0, "selective_returner": 0, "frequent_returner": 0,
    "try_before_buy": 0
  }'::jsonb,

  -- DIMENSION 58: Gift Purchasing
  ADD COLUMN IF NOT EXISTS gift_purchasing_layers JSONB DEFAULT '{
    "frequent_gifter": 0, "occasion_gifter": 0, "self_only": 0,
    "gift_focused": 0
  }'::jsonb,

  -- DIMENSION 59: Bundle Buying
  ADD COLUMN IF NOT EXISTS bundle_buying_layers JSONB DEFAULT '{
    "single_item_buyer": 0, "pair_buyer": 0, "bundle_buyer": 0,
    "full_outfit_buyer": 0
  }'::jsonb,

  -- DIMENSION 60: Payment Method Preference
  ADD COLUMN IF NOT EXISTS payment_method_preference_layers JSONB DEFAULT '{
    "credit_card": 0, "debit": 0, "buy_now_pay_later": 0,
    "gift_card": 0, "mixed": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY E: Aesthetic Micro-preferences (10 dimensions: 61-70)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 61: Texture Preference
  ADD COLUMN IF NOT EXISTS texture_preference_layers JSONB DEFAULT '{
    "smooth_finishes": 0, "textured": 0, "mixed_textures": 0,
    "high_contrast_texture": 0
  }'::jsonb,

  -- DIMENSION 62: Embellishment Tolerance
  ADD COLUMN IF NOT EXISTS embellishment_tolerance_layers JSONB DEFAULT '{
    "no_embellishment": 0, "subtle": 0, "moderate": 0, "maximalist": 0
  }'::jsonb,

  -- DIMENSION 63: Hardware Finish
  ADD COLUMN IF NOT EXISTS hardware_finish_layers JSONB DEFAULT '{
    "gold_hardware": 0, "silver_hardware": 0, "mixed_metals": 0,
    "no_hardware": 0
  }'::jsonb,

  -- DIMENSION 64: Transparency Preference
  ADD COLUMN IF NOT EXISTS transparency_preference_layers JSONB DEFAULT '{
    "no_sheer": 0, "subtle_sheer": 0, "strategic_sheer": 0, "full_sheer": 0
  }'::jsonb,

  -- DIMENSION 65: Layering Behavior
  ADD COLUMN IF NOT EXISTS layering_behavior_layers JSONB DEFAULT '{
    "single_layer": 0, "light_layering": 0, "heavy_layering": 0,
    "year_round_layerer": 0
  }'::jsonb,

  -- DIMENSION 66: Proportion Play
  ADD COLUMN IF NOT EXISTS proportion_play_layers JSONB DEFAULT '{
    "balanced_proportions": 0, "oversized_top_fitted_bottom": 0,
    "fitted_top_oversized_bottom": 0, "monochrome_silhouette": 0
  }'::jsonb,

  -- DIMENSION 67: Color Contrast
  ADD COLUMN IF NOT EXISTS color_contrast_layers JSONB DEFAULT '{
    "monochromatic": 0, "low_contrast": 0, "high_contrast": 0,
    "color_blocking": 0
  }'::jsonb,

  -- DIMENSION 68: Print Mixing
  ADD COLUMN IF NOT EXISTS print_mixing_layers JSONB DEFAULT '{
    "no_print_mixing": 0, "subtle_mixing": 0, "bold_mixing": 0,
    "pattern_matcher": 0
  }'::jsonb,

  -- DIMENSION 69: Shine Level
  ADD COLUMN IF NOT EXISTS shine_level_layers JSONB DEFAULT '{
    "matte_only": 0, "subtle_shine": 0, "high_shine": 0, "metallic_lover": 0
  }'::jsonb,

  -- DIMENSION 70: Structure vs. Drape
  ADD COLUMN IF NOT EXISTS structure_vs_drape_layers JSONB DEFAULT '{
    "structured_only": 0, "balanced": 0, "drapey_preferred": 0,
    "mixed_approach": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY F: Occasion-Specific Depth (8 dimensions: 71-78)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 71: Work Style Depth
  ADD COLUMN IF NOT EXISTS work_style_depth_layers JSONB DEFAULT '{
    "suiting_focused": 0, "smart_casual": 0, "creative_professional": 0,
    "uniform_based": 0
  }'::jsonb,

  -- DIMENSION 72: Evening Wear Style
  ADD COLUMN IF NOT EXISTS evening_wear_style_layers JSONB DEFAULT '{
    "cocktail_preferred": 0, "black_tie": 0, "semi_formal": 0,
    "dressy_casual": 0
  }'::jsonb,

  -- DIMENSION 73: Vacation Style
  ADD COLUMN IF NOT EXISTS vacation_style_layers JSONB DEFAULT '{
    "resort_wear": 0, "adventure_travel": 0, "city_travel": 0,
    "beach_focused": 0
  }'::jsonb,

  -- DIMENSION 74: Athleisure Purpose
  ADD COLUMN IF NOT EXISTS athleisure_purpose_layers JSONB DEFAULT '{
    "gym_focused": 0, "lifestyle_athleisure": 0, "performance_athlete": 0,
    "yoga_specific": 0
  }'::jsonb,

  -- DIMENSION 75: Weekend Style
  ADD COLUMN IF NOT EXISTS weekend_style_layers JSONB DEFAULT '{
    "elevated_casual": 0, "relaxed_comfort": 0, "sporty_weekend": 0,
    "dressed_down": 0
  }'::jsonb,

  -- DIMENSION 76: Date Night Style
  ADD COLUMN IF NOT EXISTS date_night_style_layers JSONB DEFAULT '{
    "romantic_feminine": 0, "edgy_bold": 0, "elegant_classic": 0,
    "casual_chic": 0
  }'::jsonb,

  -- DIMENSION 77: Brunch Style
  ADD COLUMN IF NOT EXISTS brunch_style_layers JSONB DEFAULT '{
    "polished_casual": 0, "effortless_chic": 0, "bohemian": 0, "preppy": 0
  }'::jsonb,

  -- DIMENSION 78: Airport Style
  ADD COLUMN IF NOT EXISTS airport_style_layers JSONB DEFAULT '{
    "comfort_first": 0, "elevated_casual": 0, "athleisure": 0,
    "coordinated_traveler": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY G: Brand Relationship Depth (8 dimensions: 79-86)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 79: Brand Discovery Method
  ADD COLUMN IF NOT EXISTS brand_discovery_method_layers JSONB DEFAULT '{
    "influencer_discovery": 0, "editorial_discovery": 0, "social_ads": 0,
    "organic_search": 0, "friend_referral": 0
  }'::jsonb,

  -- DIMENSION 80: Brand Switching Tendency
  ADD COLUMN IF NOT EXISTS brand_switching_tendency_layers JSONB DEFAULT '{
    "serial_monogamist": 0, "multi_brand_loyal": 0, "constant_explorer": 0,
    "one_true_brand": 0
  }'::jsonb,

  -- DIMENSION 81: Emerging Brand Openness
  ADD COLUMN IF NOT EXISTS emerging_brand_openness_layers JSONB DEFAULT '{
    "pioneer": 0, "early_supporter": 0, "waits_for_validation": 0,
    "established_only": 0
  }'::jsonb,

  -- DIMENSION 82: Direct-to-Consumer Affinity
  ADD COLUMN IF NOT EXISTS dtc_affinity_layers JSONB DEFAULT '{
    "dtc_preferred": 0, "traditional_retail": 0, "mixed": 0,
    "marketplace_focused": 0
  }'::jsonb,

  -- DIMENSION 83: Designer Collaboration Interest
  ADD COLUMN IF NOT EXISTS designer_collaboration_interest_layers JSONB DEFAULT '{
    "collab_hunter": 0, "selective_interest": 0, "mass_market_only": 0,
    "designer_only": 0
  }'::jsonb,

  -- DIMENSION 84: Vintage/Resale Behavior
  ADD COLUMN IF NOT EXISTS vintage_resale_behavior_layers JSONB DEFAULT '{
    "vintage_lover": 0, "secondhand_primary": 0, "occasional_resale": 0,
    "new_only": 0
  }'::jsonb,

  -- DIMENSION 85: Sample Sale Behavior
  ADD COLUMN IF NOT EXISTS sample_sale_behavior_layers JSONB DEFAULT '{
    "sample_sale_hunter": 0, "opportunistic": 0, "never_attends": 0,
    "waits_for_final_sale": 0
  }'::jsonb,

  -- DIMENSION 86: Subscription Box Interest
  ADD COLUMN IF NOT EXISTS subscription_box_interest_layers JSONB DEFAULT '{
    "subscription_enthusiast": 0, "tried_and_quit": 0, "interested": 0,
    "not_interested": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY H: Quality & Longevity (6 dimensions: 87-92)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 87: Quality Expectations
  ADD COLUMN IF NOT EXISTS quality_expectations_layers JSONB DEFAULT '{
    "luxury_quality_only": 0, "good_enough": 0, "fast_fashion_acceptable": 0,
    "investment_focused": 0
  }'::jsonb,

  -- DIMENSION 88: Care Requirements Tolerance
  ADD COLUMN IF NOT EXISTS care_requirements_tolerance_layers JSONB DEFAULT '{
    "dry_clean_okay": 0, "hand_wash_acceptable": 0, "machine_wash_only": 0,
    "low_maintenance": 0
  }'::jsonb,

  -- DIMENSION 89: Trend Longevity Preference
  ADD COLUMN IF NOT EXISTS trend_longevity_preference_layers JSONB DEFAULT '{
    "timeless_only": 0, "season_specific_okay": 0, "micro_trends_okay": 0,
    "trend_cycling": 0
  }'::jsonb,

  -- DIMENSION 90: Wear Frequency Expectation
  ADD COLUMN IF NOT EXISTS wear_frequency_expectation_layers JSONB DEFAULT '{
    "high_rotation": 0, "medium_rotation": 0, "special_occasion_only": 0,
    "archive_collector": 0
  }'::jsonb,

  -- DIMENSION 91: Damage Tolerance
  ADD COLUMN IF NOT EXISTS damage_tolerance_layers JSONB DEFAULT '{
    "pristine_required": 0, "light_wear_okay": 0, "distressed_preferred": 0,
    "vintage_character": 0
  }'::jsonb,

  -- DIMENSION 92: Alteration Willingness
  ADD COLUMN IF NOT EXISTS alteration_willingness_layers JSONB DEFAULT '{
    "alters_frequently": 0, "occasional_alterations": 0, "rarely_alters": 0,
    "never_alters": 0
  }'::jsonb;

-- ============================================================================
-- CATEGORY I: Social & Cultural Dimensions (8 dimensions: 93-100)
-- ============================================================================

ALTER TABLE style_profiles
  -- DIMENSION 93: Cultural Style Influence
  ADD COLUMN IF NOT EXISTS cultural_style_influence_layers JSONB DEFAULT '{
    "american_classic": 0, "european_minimalism": 0, "japanese_aesthetic": 0,
    "korean_fashion": 0, "french_chic": 0, "italian_glamour": 0
  }'::jsonb,

  -- DIMENSION 94: Generational Style
  ADD COLUMN IF NOT EXISTS generational_style_layers JSONB DEFAULT '{
    "gen_z_trends": 0, "millennial_style": 0, "gen_x_classic": 0,
    "boomer_traditional": 0, "ageless": 0
  }'::jsonb,

  -- DIMENSION 95: Social Media Presence
  ADD COLUMN IF NOT EXISTS social_media_presence_layers JSONB DEFAULT '{
    "highly_active": 0, "moderate": 0, "minimal": 0, "not_present": 0
  }'::jsonb,

  -- DIMENSION 96: Community Engagement
  ADD COLUMN IF NOT EXISTS community_engagement_layers JSONB DEFAULT '{
    "community_active": 0, "occasional_participant": 0, "lurker": 0,
    "solo_shopper": 0
  }'::jsonb,

  -- DIMENSION 97: Style Tribe Affiliation
  ADD COLUMN IF NOT EXISTS style_tribe_affiliation_layers JSONB DEFAULT '{
    "coastal_grandmother": 0, "dark_academia": 0, "cottagecore": 0,
    "clean_girl": 0, "old_money": 0, "gorpcore": 0
  }'::jsonb,

  -- DIMENSION 98: Fashion Week Interest
  ADD COLUMN IF NOT EXISTS fashion_week_interest_layers JSONB DEFAULT '{
    "runway_follower": 0, "trend_observer": 0, "not_interested": 0,
    "industry_insider": 0
  }'::jsonb,

  -- DIMENSION 99: Celebrity Style Influence
  ADD COLUMN IF NOT EXISTS celebrity_style_influence_layers JSONB DEFAULT '{
    "celebrity_inspired": 0, "occasionally_influenced": 0,
    "not_influenced": 0, "anti_celebrity": 0
  }'::jsonb,

  -- DIMENSION 100: Regional Style Identity
  ADD COLUMN IF NOT EXISTS regional_style_identity_layers JSONB DEFAULT '{
    "coastal_style": 0, "southern_prep": 0, "midwest_casual": 0,
    "urban_edge": 0, "southwest_boho": 0, "mountain_modern": 0
  }'::jsonb;

-- ============================================================================
-- CREATE GIN INDEXES FOR ALL NEW DIMENSIONS (Performance)
-- ============================================================================

-- Category A: Body & Fit Intelligence
CREATE INDEX IF NOT EXISTS idx_style_profiles_body_type_preference ON style_profiles USING GIN (body_type_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_size_consistency ON style_profiles USING GIN (size_consistency_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_comfort_priority ON style_profiles USING GIN (comfort_priority_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_height_accommodation ON style_profiles USING GIN (height_accommodation_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_sleeve_preference ON style_profiles USING GIN (sleeve_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_neckline_preference ON style_profiles USING GIN (neckline_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_waist_placement ON style_profiles USING GIN (waist_placement_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_leg_opening ON style_profiles USING GIN (leg_opening_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_arm_coverage ON style_profiles USING GIN (arm_coverage_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_torso_length_fit ON style_profiles USING GIN (torso_length_fit_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_rise_preference ON style_profiles USING GIN (rise_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_strap_style ON style_profiles USING GIN (strap_style_layers);

-- Category B: Lifestyle & Context
CREATE INDEX IF NOT EXISTS idx_style_profiles_work_environment ON style_profiles USING GIN (work_environment_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_activity_level ON style_profiles USING GIN (activity_level_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_climate_adaptation ON style_profiles USING GIN (climate_adaptation_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_travel_frequency ON style_profiles USING GIN (travel_frequency_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_social_calendar ON style_profiles USING GIN (social_calendar_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_parenting_status ON style_profiles USING GIN (parenting_status_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_pet_ownership ON style_profiles USING GIN (pet_ownership_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_commute_type ON style_profiles USING GIN (commute_type_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_housing_type ON style_profiles USING GIN (housing_type_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_income_stability ON style_profiles USING GIN (income_stability_layers);

-- Category C: Fashion Psychology
CREATE INDEX IF NOT EXISTS idx_style_profiles_risk_tolerance ON style_profiles USING GIN (risk_tolerance_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_brand_prestige_sensitivity ON style_profiles USING GIN (brand_prestige_sensitivity_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_trend_adoption_speed ON style_profiles USING GIN (trend_adoption_speed_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_fashion_knowledge_level ON style_profiles USING GIN (fashion_knowledge_level_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_style_confidence ON style_profiles USING GIN (style_confidence_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_decision_making_speed ON style_profiles USING GIN (decision_making_speed_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_fomo_susceptibility ON style_profiles USING GIN (fomo_susceptibility_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_comparison_shopping_behavior ON style_profiles USING GIN (comparison_shopping_behavior_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_review_dependency ON style_profiles USING GIN (review_dependency_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_influencer_influence_level ON style_profiles USING GIN (influencer_influence_level_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_editorial_trust ON style_profiles USING GIN (editorial_trust_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_visual_shopping_style ON style_profiles USING GIN (visual_shopping_style_layers);

-- Category D: Purchase Behavior Patterns
CREATE INDEX IF NOT EXISTS idx_style_profiles_replenishment_cycle ON style_profiles USING GIN (replenishment_cycle_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_wardrobe_completion_strategy ON style_profiles USING GIN (wardrobe_completion_strategy_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_sale_strategy ON style_profiles USING GIN (sale_strategy_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_pre_ordering_behavior ON style_profiles USING GIN (pre_ordering_behavior_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_backorder_tolerance ON style_profiles USING GIN (backorder_tolerance_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_cart_abandonment_pattern ON style_profiles USING GIN (cart_abandonment_pattern_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_return_frequency ON style_profiles USING GIN (return_frequency_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_gift_purchasing ON style_profiles USING GIN (gift_purchasing_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_bundle_buying ON style_profiles USING GIN (bundle_buying_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_payment_method_preference ON style_profiles USING GIN (payment_method_preference_layers);

-- Category E: Aesthetic Micro-preferences
CREATE INDEX IF NOT EXISTS idx_style_profiles_texture_preference ON style_profiles USING GIN (texture_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_embellishment_tolerance ON style_profiles USING GIN (embellishment_tolerance_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_hardware_finish ON style_profiles USING GIN (hardware_finish_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_transparency_preference ON style_profiles USING GIN (transparency_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_layering_behavior ON style_profiles USING GIN (layering_behavior_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_proportion_play ON style_profiles USING GIN (proportion_play_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_color_contrast ON style_profiles USING GIN (color_contrast_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_print_mixing ON style_profiles USING GIN (print_mixing_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_shine_level ON style_profiles USING GIN (shine_level_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_structure_vs_drape ON style_profiles USING GIN (structure_vs_drape_layers);

-- Category F: Occasion-Specific Depth
CREATE INDEX IF NOT EXISTS idx_style_profiles_work_style_depth ON style_profiles USING GIN (work_style_depth_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_evening_wear_style ON style_profiles USING GIN (evening_wear_style_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_vacation_style ON style_profiles USING GIN (vacation_style_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_athleisure_purpose ON style_profiles USING GIN (athleisure_purpose_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_weekend_style ON style_profiles USING GIN (weekend_style_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_date_night_style ON style_profiles USING GIN (date_night_style_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_brunch_style ON style_profiles USING GIN (brunch_style_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_airport_style ON style_profiles USING GIN (airport_style_layers);

-- Category G: Brand Relationship Depth
CREATE INDEX IF NOT EXISTS idx_style_profiles_brand_discovery_method ON style_profiles USING GIN (brand_discovery_method_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_brand_switching_tendency ON style_profiles USING GIN (brand_switching_tendency_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_emerging_brand_openness ON style_profiles USING GIN (emerging_brand_openness_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_dtc_affinity ON style_profiles USING GIN (dtc_affinity_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_designer_collaboration_interest ON style_profiles USING GIN (designer_collaboration_interest_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_vintage_resale_behavior ON style_profiles USING GIN (vintage_resale_behavior_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_sample_sale_behavior ON style_profiles USING GIN (sample_sale_behavior_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_subscription_box_interest ON style_profiles USING GIN (subscription_box_interest_layers);

-- Category H: Quality & Longevity
CREATE INDEX IF NOT EXISTS idx_style_profiles_quality_expectations ON style_profiles USING GIN (quality_expectations_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_care_requirements_tolerance ON style_profiles USING GIN (care_requirements_tolerance_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_trend_longevity_preference ON style_profiles USING GIN (trend_longevity_preference_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_wear_frequency_expectation ON style_profiles USING GIN (wear_frequency_expectation_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_damage_tolerance ON style_profiles USING GIN (damage_tolerance_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_alteration_willingness ON style_profiles USING GIN (alteration_willingness_layers);

-- Category I: Social & Cultural Dimensions
CREATE INDEX IF NOT EXISTS idx_style_profiles_cultural_style_influence ON style_profiles USING GIN (cultural_style_influence_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_generational_style ON style_profiles USING GIN (generational_style_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_social_media_presence ON style_profiles USING GIN (social_media_presence_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_community_engagement ON style_profiles USING GIN (community_engagement_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_style_tribe_affiliation ON style_profiles USING GIN (style_tribe_affiliation_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_fashion_week_interest ON style_profiles USING GIN (fashion_week_interest_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_celebrity_style_influence ON style_profiles USING GIN (celebrity_style_influence_layers);
CREATE INDEX IF NOT EXISTS idx_style_profiles_regional_style_identity ON style_profiles USING GIN (regional_style_identity_layers);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE style_profiles IS '100-dimensional customer style profile enabling thousands of unique customer segments';

COMMENT ON COLUMN style_profiles.body_type_preference_layers IS 'Dimension 17: Body type and fit preferences (8 values)';
COMMENT ON COLUMN style_profiles.size_consistency_layers IS 'Dimension 18: Size consistency patterns (5 values)';
COMMENT ON COLUMN style_profiles.comfort_priority_layers IS 'Dimension 19: Comfort vs style trade-offs (5 values)';
COMMENT ON COLUMN style_profiles.regional_style_identity_layers IS 'Dimension 100: Regional style affiliations (6 values)';
