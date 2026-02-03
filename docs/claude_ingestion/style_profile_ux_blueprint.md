# Style Profile UX Blueprint

Date: 2026-02-03

## Goal
Use influencer‑derived style signals to create a visible, useful, and delightful personalized shopping experience.

## Surface 1: Onboarding
- Ask: "Which creators do you love?"
- Immediately show:
  - "Your style snapshot" (top 2 archetypes + price tier)
  - "Recommended stores" based on price tier + category focus

## Surface 2: Home Feed
- Personalized carousels:
  - "Because you follow X..."
  - "Your Workwear Edit"
  - "Luxury Bags You’ll Love"
- Merchandising rules:
  - Rank items by match to top 2 style archetypes + top category.

## Surface 3: Collections
- Auto‑generated boards:
  - "Minimal Workwear Staples"
  - "Glam Evening Looks"
  - "Streetwear Sneaker Picks"

## Surface 4: Creator Recommendations
- "Creators like X" (similar style archetype + price tier + engagement)
- CTA: Follow / Save

## Surface 5: Retailer Prioritization
- Reorder retailer list based on price tier + categories.
- Example:
  - Premium + workwear → prioritize Aritzia, COS, Theory, etc.

## Personalization Logic
- Signal source: influencer follow + browsing + purchase
- Decay: reduce older signals over time
- Confidence gates:
  - If confidence < 0.3: show generic feed
  - If confidence >= 0.3: show personalized feed

## Metrics
- CTR on personalized carousels
- Add‑to‑cart conversion
- Engagement with creator recs
- Retention lift from personalization

