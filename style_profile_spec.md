# Style Profile Spec

Date: 2026-02-03

## Purpose
Turn influencer signals + user behavior into a structured, confidence‑weighted profile that powers personalization, recommendations, and UI copy.

## Inputs
- Influencer signals (from `public_influencer_pilot.csv`):
  - `style_archetype`, `price_tier`, `category_focus`, `commerce_readiness_score`, `audience_life_stage`
- User events:
  - follows, likes, saves, clicks, cart adds, purchases
- Item metadata:
  - category, price, brand, retailer

## Core Data Model (per user)

### StyleProfile
- `user_id`
- `style_layers` (map)
  - keys: `minimal`, `streetwear`, `glam`, `classic`, `boho`, `athleisure`, `romantic`, `edgy`, `preppy`, `avant_garde`
  - values: `score` 0–1
- `price_layers` (map)
  - keys: `budget`, `mid`, `premium`, `luxury`
  - values: `score` 0–1
- `category_layers` (map)
  - keys: `bags`, `shoes`, `denim`, `workwear`, `occasion`, `accessories`, `active`, `mixed`
  - values: `score` 0–1
- `occasion_layers` (map)
  - keys: `work`, `event`, `casual`, `athleisure`
  - values: `score` 0–1
- `commerce_intent` (0–1)
- `confidence` (0–1)

## Scoring Logic (v1)

### Event weights
- follow influencer: +1.0
- like: +0.6
- save: +0.9
- click: +0.5
- add to cart: +1.2
- purchase: +1.5

### Signal lift
- If influencer has `style_archetype`, add weight to that style.
- If influencer has `category_focus`, add weight to that category.
- If influencer has `price_tier`, add weight to that price tier.
- If influencer has `commerce_readiness_score >= 20`, add +0.1 to commerce_intent.

### Normalization
- Normalize each layer to 0–1 by dividing by max layer score.
- Set `confidence` = min(1, log10(total_events + 1) / 2)

## Output
- Style Profile is stored and updated incrementally per user.
- Used in ranking, filtering, and user‑facing personalization copy.

