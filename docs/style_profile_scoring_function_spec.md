# Style Profile Scoring Function Spec

Date: 2026-02-03

## Purpose
Define how a user’s Style Profile is updated from influencer follows + interactions and shopping behaviors.

## Inputs
- Event
  - `user_id`
  - `event_type`: `follow | like | save | click | add_to_cart | purchase`
  - `source_type`: `influencer | product | retailer`
  - `source_id`
  - `timestamp`
- Influencer metadata (if `source_type = influencer`)
  - `style_archetype`, `price_tier`, `category_focus`, `commerce_readiness_score`
- Product metadata (if `source_type = product`)
  - `category`, `price_tier`, `occasion`

## Output
- Updated `StyleProfile` object

## Weights
- follow: +1.0
- like: +0.6
- save: +0.9
- click: +0.5
- add_to_cart: +1.2
- purchase: +1.5

## Update Rules
1. **Style layers**
   - If influencer has `style_archetype`, add `weight` to that layer.
2. **Price layers**
   - Add `weight` to influencer `price_tier` or product `price_tier`.
3. **Category layers**
   - Add `weight` to influencer `category_focus` or product `category`.
4. **Occasion layers**
   - Add `weight` to product `occasion` or inferred influencer occasion.
5. **Commerce intent**
   - If influencer `commerce_readiness_score >= 20`, add +0.1 per follow.
   - If user purchases, add +0.2.

## Normalization
- Normalize each layer by dividing by max value in that layer group.
- Compute `confidence = min(1, log10(total_events + 1) / 2)`.

## Decay (optional)
- Weekly decay: multiply all layer scores by 0.98 to reflect changing tastes.

## Example (Pseudo)
```
weight = EVENT_WEIGHTS[event_type]
if source_type == influencer:
  style_layers[style_archetype] += weight
  price_layers[price_tier] += weight
  category_layers[category_focus] += weight
  if commerce_readiness_score >= 20:
    commerce_intent += 0.1
if source_type == product:
  category_layers[product_category] += weight
  price_layers[product_price_tier] += weight
  occasion_layers[product_occasion] += weight
normalize_layers()
```

