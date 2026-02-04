# Influencer Scoring Schema

Date: 2026-02-03

## Purpose
Define a top-down schema for influencer analysis and bottom-up scoring. This schema is designed to map influencer attributes to shopper preferences and readiness for commerce.

## Schema Fields (Added to CSV)

### Identity & Style
- `creator_type`: `celebrity | model | fashion_influencer | stylist | creator_brand | publisher | retailer | designer | unknown`
- `style_archetype`: `classic | minimal | streetwear | boho | glam | athleisure | romantic | edgy | preppy | avant_garde | unknown`
- `price_tier`: `budget | mid | premium | luxury | unknown`
- `category_focus`: `bags | denim | shoes | accessories | workwear | occasion | basics | active | mixed | unknown`
- `audience_life_stage`: `student | early_career | parent | luxury | aspirational | budget | unknown`

### Scoring Inputs
- `commerce_readiness_score` (0-40)
  - +20 if LTK signal = Yes
  - +20 if ShopMy signal = Yes
- `influence_score` (0-100)
  - Derived from `composite_score * 100`
- `matchability_score` (0-20)
  - Reserved for later: based on style consistency and category clarity
- `audience_fit_score` (0-20)
  - Reserved for later: based on audience and price-tier alignment

### Output
- `final_score`
  - `influence_score + commerce_readiness_score + matchability_score + audience_fit_score`
- `scoring_notes`
- `scored_on`

## Current Status
- We populated `influence_score`, `commerce_readiness_score`, `final_score`, `scoring_notes`, `scored_on` for all 519 creators.
- All other semantic fields are set to `unknown` pending enrichment.

## Next Enrichment Steps (Optional)
- Extract LTK/ShopMy signals via bio/link scanning to improve commerce readiness.
- Map style archetype and price tier using content analysis or curated tagging.
- Translate influencer categories into shopper preference signals for the recommender.

