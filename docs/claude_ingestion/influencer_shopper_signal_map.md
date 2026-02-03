# Influencer → Shopper Signal Map (v1)

Date: 2026-02-03

## Purpose
Translate influencer attributes into shopper signals the recommender can ingest. This is the bridge between “who a user follows” and “what Muse should infer about their preferences.”

## Signal Model Overview
For each influencer, derive a set of shopper signals with confidence scores. These signals become inputs to the recommender.

### Signal Types
- **Style Signal**: aesthetic direction (e.g., minimal, streetwear, glam)
- **Price Signal**: budget sensitivity (budget / mid / premium / luxury)
- **Category Signal**: product focus (bags, shoes, denim, workwear, accessories, etc.)
- **Occasion Signal**: lifestyle context (work, event, casual, athleisure)
- **Commerce Intent Signal**: how likely the user is to shop (LTK/ShopMy/CTA behavior)

## Mapping Rules (v1)

### 1) Creator Type → Base Shopper Signals
- `celebrity` → aspirational + premium/luxury tilt + high brand affinity
- `model` → editorial + premium tilt + trend-forward
- `fashion_influencer` → broad relevance + mid/premium tilt
- `publisher` → trend awareness + category breadth
- `retailer` → high commerce intent + direct brand affinity
- `designer` → luxury tilt + design-forward

### 2) Style Archetype → Style Signals
- `minimal` → clean lines, neutral palette, modern basics
- `streetwear` → casual, graphic, sneakers, hype brands
- `glam` → occasionwear, statement pieces
- `classic` → timeless, tailored, neutral palette
- `boho` → relaxed silhouettes, earth tones
- `athleisure` → performance fabrics, activewear

### 3) Price Tier → Price Signals
- `budget` → value-sensitive, promo-driven
- `mid` → balanced value/quality
- `premium` → quality-driven, selective
- `luxury` → brand prestige and high AOV

### 4) Category Focus → Category Signals
- `bags` → handbag affinity
- `shoes` → footwear affinity
- `denim` → denim/core basics
- `workwear` → office/professional clothing
- `occasion` → event/partywear
- `accessories` → jewelry, sunglasses, etc.
- `active` → fitness/activewear
- `mixed` → generalist fashion preferences

### 5) Commerce Readiness → Purchase Intent Signals
- If `LTK` or `ShopMy` signal present → high purchase intent
- If affiliate CTA present → medium purchase intent
- Else → low/medium purchase intent

## Signal Scoring (v1)
Each signal is assigned a confidence between 0 and 1.

- Base confidence: 0.5
- +0.2 if multiple consistent signals (e.g., style + category reinforce)
- +0.2 if commerce readiness is high
- -0.2 if signals are inferred only from high-level creator type

## Example
If user follows an influencer with:
- creator_type = fashion_influencer
- style_archetype = minimal
- price_tier = premium
- category_focus = workwear
- LTK = Yes

Then infer shopper signals:
- Style: minimal (0.9)
- Price: premium (0.8)
- Category: workwear (0.8)
- Occasion: work (0.7)
- Commerce intent: high (0.8)

## Next Steps
- Enrich style archetype and category focus using content tagging or manual curation.
- Add a rule library to operationalize inference in the recommender.

