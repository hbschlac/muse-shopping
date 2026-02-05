# 16-Dimensional Style Profile System

## Overview

The customer style profile has been expanded from **4 dimensions to 16 dimensions** for 4x more granular understanding of each shopper's preferences, values, and behaviors.

Each dimension is a JSONB layer with weighted values that update based on customer actions (clicks, saves, purchases, follows, etc.).

---

## 📊 Complete Dimension Breakdown

### **DIMENSION 1: Style Archetype** (Original)
**Total Values: 10**

| Value | Description |
|-------|-------------|
| `minimal` | Clean lines, neutral palette, understated elegance |
| `classic` | Timeless pieces, tailored fits, traditional styling |
| `romantic` | Feminine details, soft fabrics, delicate touches |
| `glam` | Statement pieces, luxe fabrics, eye-catching details |
| `streetwear` | Urban edge, athleisure influence, casual cool |
| `boho` | Free-spirited, eclectic mix, artisan touches |
| `edgy` | Bold choices, unconventional styling, dark palette |
| `athleisure` | Sport-inspired, performance fabrics, casual comfort |
| `preppy` | Collegiate vibes, polished casual, heritage brands |
| `avant_garde` | Experimental, artistic, fashion-forward |

---

### **DIMENSION 2: Price Tier** (Original)
**Total Values: 4**

| Value | Price Range | Description |
|-------|-------------|-------------|
| `budget` | <$50 | Value-conscious, affordable basics |
| `mid` | $50-$200 | Contemporary pricing, accessible quality |
| `premium` | $200-$500 | Designer pricing, elevated quality |
| `luxury` | $500+ | High-end luxury, investment pieces |

---

### **DIMENSION 3: Category Focus** (Original)
**Total Values: 9**

| Value | Description |
|-------|-------------|
| `bags` | Handbags, clutches, totes, crossbody |
| `shoes` | All footwear categories |
| `denim` | Jeans, denim jackets, denim skirts |
| `workwear` | Professional attire, suiting, business casual |
| `occasion` | Dresses for events, special occasions |
| `accessories` | Jewelry, scarves, belts, sunglasses |
| `active` | Activewear, athleisure, sneakers |
| `outerwear` | Coats, jackets, blazers |
| `mixed` | No clear category preference |

---

### **DIMENSION 4: Occasion** (Original)
**Total Values: 5**

| Value | Description |
|-------|-------------|
| `casual` | Everyday wear, weekend outfits |
| `work` | Professional settings, office wear |
| `event` | Special occasions, evening wear, weddings |
| `athleisure` | Gym-to-street, active lifestyle |
| `vacation` | Travel-friendly, resort wear |

---

### **DIMENSION 5: Color Palette** (NEW)
**Total Values: 8**

| Value | Description | Examples |
|-------|-------------|----------|
| `neutral` | Black, white, beige, grey, navy | Foundational wardrobe colors |
| `earth_tones` | Brown, tan, olive, terracotta, rust | Natural, grounded palette |
| `pastels` | Soft pink, baby blue, lavender, mint | Soft, feminine hues |
| `jewel_tones` | Emerald, sapphire, ruby, amethyst | Rich, saturated colors |
| `monochrome` | Single color in varying shades | Tonal dressing |
| `brights` | Bold primary colors, neon, vivid hues | Statement colors |
| `metallics` | Gold, silver, bronze, rose gold | Shimmer and shine |
| `prints` | Multi-color patterns, mixed palettes | Pattern-focused |

---

### **DIMENSION 6: Material & Fabric** (NEW)
**Total Values: 10**

| Value | Description |
|-------|-------------|
| `cotton` | Natural, breathable, everyday comfort |
| `silk` | Luxurious, smooth, elegant drape |
| `wool` | Warm, structured, classic suiting |
| `cashmere` | Ultra-soft, luxury knitwear |
| `leather` | Edge and structure, investment pieces |
| `synthetic` | Performance fabrics, technical materials |
| `linen` | Breathable, relaxed, summer staple |
| `denim` | Sturdy, casual, timeless |
| `velvet` | Rich texture, evening-appropriate |
| `knit` | Cozy, stretchy, comfortable |

---

### **DIMENSION 7: Fit & Silhouette** (NEW)
**Total Values: 8**

| Value | Description |
|-------|-------------|
| `oversized` | Relaxed, roomy, comfort-first |
| `tailored` | Fitted, structured, polished |
| `bodycon` | Form-fitting, curve-hugging |
| `relaxed` | Easy fit, not oversized but comfortable |
| `structured` | Defined shape, architectural elements |
| `flowy` | Loose, draped, movement-friendly |
| `cropped` | Shortened length, modern proportions |
| `longline` | Extended length, elongating effect |

---

### **DIMENSION 8: Brand Tier Affinity** (NEW)
**Total Values: 8**

| Value | Description |
|-------|-------------|
| `contemporary` | Modern brands like Everlane, Reformation |
| `designer` | Recognized designer labels |
| `luxury` | High-end fashion houses |
| `fast_fashion` | Trend-driven, affordable brands |
| `sustainable` | Eco-conscious, ethical brands |
| `indie` | Small independent designers |
| `heritage` | Established legacy brands |
| `emerging` | New, up-and-coming designers |

---

### **DIMENSION 9: Shopping Motivation** (NEW)
**Total Values: 8**

| Value | Description | Triggered By |
|-------|-------------|--------------|
| `trend_driven` | Follows current trends | Clicks on new arrivals, trending items |
| `investment_piece` | Seeks long-term value | Purchases high-price items |
| `wardrobe_staple` | Builds foundational wardrobe | Saves basics, neutrals |
| `statement_piece` | Wants standout items | Clicks bold, unique pieces |
| `sale_hunting` | Price-conscious shopping | Clicks sale sections |
| `impulse` | Quick decision-making | Fast click-to-purchase |
| `replacement` | Replacing worn items | Searches specific categories |
| `occasion_specific` | Shopping for an event | Filters by occasion |

---

### **DIMENSION 10: Seasonality** (NEW)
**Total Values: 6**

| Value | Description |
|-------|-------------|
| `spring` | Light layers, pastels, transitional pieces |
| `summer` | Lightweight, breathable, vacation-ready |
| `fall` | Layering pieces, earth tones, knits |
| `winter` | Outerwear, cozy fabrics, warm layers |
| `transitional` | Season-bridging pieces |
| `year_round` | Timeless, seasonless staples |

---

### **DIMENSION 11: Detail Preferences** (NEW)
**Total Values: 10**

| Value | Description |
|-------|-------------|
| `minimal_details` | Clean, unembellished design |
| `hardware` | Zippers, buckles, grommets, studs |
| `embroidery` | Hand-stitched details, thread work |
| `sequins` | Sparkle, glamorous embellishment |
| `ruffles` | Romantic, feminine details |
| `cutouts` | Strategic openings, modern edge |
| `lace` | Delicate, romantic texture |
| `buttons` | Functional or decorative closures |
| `zippers` | Exposed or decorative |
| `pleats` | Structured folds, texture |

---

### **DIMENSION 12: Length & Coverage** (NEW)
**Total Values: 8**

| Value | Description |
|-------|-------------|
| `mini` | Above knee, shorter lengths |
| `midi` | Mid-calf, modern silhouette |
| `maxi` | Floor-length, elegant |
| `ankle` | Hits at ankle, cropped look |
| `knee` | Knee-length, classic |
| `full_coverage` | Modest, covered styling |
| `cropped` | Shortened tops, modern proportion |
| `revealing` | Low-cut, open back, sheer |

---

### **DIMENSION 13: Pattern Preferences** (NEW)
**Total Values: 10**

| Value | Description |
|-------|-------------|
| `solid` | Single color, no pattern |
| `stripes` | Linear patterns, nautical vibes |
| `florals` | Botanical prints, romantic |
| `animal_print` | Leopard, zebra, snake |
| `geometric` | Abstract shapes, modern |
| `polka_dots` | Playful, retro charm |
| `abstract` | Artistic, painterly patterns |
| `plaid` | Checked patterns, heritage |
| `paisley` | Intricate, boho patterns |
| `tie_dye` | Gradient, hippie-inspired |

---

### **DIMENSION 14: Versatility & Mixing** (NEW)
**Total Values: 6**

| Value | Description | Learned From |
|-------|-------------|--------------|
| `capsule_wardrobe` | Curated, minimal essentials | Repeat purchases of basics |
| `maximalist` | More is more, eclectic mix | High purchase frequency |
| `mix_high_low` | Combines price points | Varied price tier purchases |
| `monobrand` | Sticks to favorite brands | Repeat brand purchases |
| `trend_mixer` | Blends trends with classics | Mix of new/classic styles |
| `classic_mixer` | Timeless combinations | Consistent classic purchases |

---

### **DIMENSION 15: Sustainability Values** (NEW)
**Total Values: 8**

| Value | Description |
|-------|-------------|
| `eco_conscious` | Environmentally-aware choices |
| `secondhand` | Pre-loved, vintage shopping |
| `ethical_production` | Fair labor, transparent supply chain |
| `local_brands` | Supports local designers |
| `vegan` | Animal-free materials |
| `circular_fashion` | Rental, resale, recycling |
| `quality_over_quantity` | Fewer, better pieces |
| `fast_fashion` | Trend-driven, frequent purchases |

---

### **DIMENSION 16: Brand Loyalty Patterns** (NEW)
**Total Values: 8**

| Value | Description | Triggered By |
|-------|-------------|--------------|
| `brand_explorer` | Tries many different brands | Diverse brand purchases |
| `brand_loyal` | Sticks to favorites | Repeat brand purchases |
| `influencer_driven` | Follows influencer recommendations | Clicks from influencer follows |
| `editor_picks` | Trusts editorial curation | Clicks on curated modules |
| `independent` | Self-directed discovery | Direct searches, browsing |
| `trendsetter` | Early adopter of new brands | Clicks on new/emerging brands |
| `classic_buyer` | Heritage brand preference | Purchases from established brands |
| `discount_driven` | Loyalty follows sales | Purchases during promotions |

---

## 📈 Total Possible Values Across All Dimensions

| Dimension | Total Values |
|-----------|--------------|
| 1. Style Archetype | 10 |
| 2. Price Tier | 4 |
| 3. Category Focus | 9 |
| 4. Occasion | 5 |
| 5. Color Palette | 8 |
| 6. Material & Fabric | 10 |
| 7. Fit & Silhouette | 8 |
| 8. Brand Tier Affinity | 8 |
| 9. Shopping Motivation | 8 |
| 10. Seasonality | 6 |
| 11. Detail Preferences | 10 |
| 12. Length & Coverage | 8 |
| 13. Pattern Preferences | 10 |
| 14. Versatility & Mixing | 6 |
| 15. Sustainability Values | 8 |
| 16. Brand Loyalty Patterns | 8 |
| **TOTAL** | **126 unique values** |

---

## 🎯 How Dimensions Are Populated

### From Product Interactions
When a customer clicks, saves, or purchases a product:
- **Dimensions 1-4**: From existing `style_tags`, `price_tier`, `category`, `occasion_tag`
- **Dimension 5**: From new `color_palette` column
- **Dimension 6**: From new `primary_material` column
- **Dimension 7**: From new `silhouette_type` column
- **Dimension 9**: Inferred from action type (click = impulse, save = consideration, purchase = investment)
- **Dimension 10**: From new `season_suitability` array
- **Dimension 11**: From new `detail_tags` array
- **Dimension 12**: From new `coverage_level` column
- **Dimension 13**: From new `pattern_type` column
- **Dimension 15**: From new `sustainability_tags` array

### From Influencer Follows
When a customer follows an influencer:
- **Dimensions 1-4**: From influencer's `style_archetype`, `price_tier`, `category_focus`
- **Dimension 5**: From new `color_palette_signature` column
- **Dimension 6**: From new `material_preference` column
- **Dimension 7**: From new `silhouette_signature` column
- **Dimension 8**: From new `brand_tier_focus` column
- **Dimension 15**: From new `sustainability_focus` boolean

### From Brand Follows
When a customer follows a brand:
- **Dimension 1**: From brand `aesthetic` array
- **Dimension 2**: From brand `price_tier`
- **Dimension 5**: From new `color_palette_signature` array
- **Dimension 6**: From new `material_specialties` array
- **Dimension 7**: From new `silhouette_focus` array
- **Dimension 8**: From new `brand_tier` column
- **Dimension 15**: From new `sustainability_certifications` array
- **Dimension 16**: Updated with `brand_loyal` pattern

### From Behavioral Patterns
Automatically inferred from shopping behavior:
- **Dimension 9**: Shopping motivation (analyzed from click-to-purchase speed, save frequency)
- **Dimension 14**: Versatility patterns (analyzed from brand diversity, price mixing)
- **Dimension 16**: Loyalty patterns (analyzed from repeat purchases, exploration vs. loyalty)

---

## 🔄 Example Customer Profile

```javascript
{
  userId: 12345,
  confidence: 0.78,
  totalEvents: 245,

  // DIMENSION 1: Style (top 3)
  style_layers: {
    minimal: 42.5,      // 42% of actions
    classic: 28.3,      // 28%
    romantic: 18.2,     // 18%
    // ... 7 more
  },

  // DIMENSION 2: Price (top preference)
  price_layers: {
    mid: 48.5,          // 48% mid-tier
    premium: 32.0,      // 32% premium
    // ... 2 more
  },

  // DIMENSION 5: Color Palette (NEW)
  color_palette_layers: {
    neutral: 52.0,      // Strong neutral preference
    earth_tones: 25.5,
    pastels: 12.0,
    // ... 5 more
  },

  // DIMENSION 6: Material (NEW)
  material_layers: {
    cotton: 38.0,       // Prefers natural fabrics
    silk: 22.5,
    linen: 18.0,
    // ... 7 more
  },

  // DIMENSION 7: Silhouette (NEW)
  silhouette_layers: {
    tailored: 45.0,     // Loves tailored fit
    relaxed: 28.5,
    structured: 15.0,
    // ... 5 more
  },

  // DIMENSION 9: Motivation (NEW)
  motivation_layers: {
    wardrobe_staple: 35.0,    // Builds capsule wardrobe
    investment_piece: 28.0,    // Quality over quantity
    trend_driven: 12.0,
    // ... 5 more
  },

  // DIMENSION 15: Sustainability (NEW)
  sustainability_layers: {
    eco_conscious: 42.0,      // Values sustainability
    quality_over_quantity: 35.0,
    ethical_production: 18.0,
    // ... 5 more
  },

  // ... all 16 dimensions
}
```

---

## 🚀 Impact on Recommendations

With **16 dimensions** and **126 possible values**, the system can now:

1. **Hyper-personalize** product recommendations based on granular preferences
2. **Predict** next purchase based on multi-dimensional signals
3. **Target** sponsored content to highly specific customer segments
4. **Identify** micro-trends within customer cohorts
5. **Score** product-customer fit across 16 different angles

### Example Recommendation Boost Calculation

```javascript
// Product scoring now considers all 16 dimensions
let boostScore = 1.0;

if (product.style_tags.includes(customer.top_style)) boostScore *= 1.3;
if (product.price_tier === customer.top_price) boostScore *= 1.2;
if (product.color_palette === customer.top_color) boostScore *= 1.15;  // NEW
if (product.primary_material === customer.top_material) boostScore *= 1.1;  // NEW
if (product.silhouette === customer.top_silhouette) boostScore *= 1.12;  // NEW
if (product.sustainability_tags.overlap(customer.sustainability_values)) boostScore *= 1.25;  // NEW

// Maximum boost: 1.3 × 1.2 × 1.15 × 1.1 × 1.12 × 1.25 = 2.52x
// A perfect match can get 2.5x ranking boost!
```

---

## 📊 Database Query Examples

### Get Complete Customer Profile
```sql
SELECT * FROM get_complete_customer_profile(12345);
```

Returns all 16 dimensions with top values and scores.

### Get Customer Summary
```sql
SELECT * FROM customer_profile_summary WHERE user_id = 12345;
```

Returns top preference from each dimension (16 columns).

### Find Similar Customers (16-Dimensional Match)
```sql
-- Find customers with similar profiles across all dimensions
SELECT
  user_id,
  -- Calculate similarity score across all 16 dimensions
  (
    similarity(style_layers, target_customer.style_layers) +
    similarity(price_layers, target_customer.price_layers) +
    similarity(category_layers, target_customer.category_layers) +
    similarity(occasion_layers, target_customer.occasion_layers) +
    similarity(color_palette_layers, target_customer.color_palette_layers) +
    similarity(material_layers, target_customer.material_layers) +
    similarity(silhouette_layers, target_customer.silhouette_layers) +
    similarity(brand_tier_layers, target_customer.brand_tier_layers) +
    similarity(motivation_layers, target_customer.motivation_layers) +
    similarity(season_layers, target_customer.season_layers) +
    similarity(detail_layers, target_customer.detail_layers) +
    similarity(coverage_layers, target_customer.coverage_layers) +
    similarity(pattern_layers, target_customer.pattern_layers) +
    similarity(versatility_layers, target_customer.versatility_layers) +
    similarity(sustainability_layers, target_customer.sustainability_layers) +
    similarity(loyalty_layers, target_customer.loyalty_layers)
  ) / 16.0 AS similarity_score
FROM style_profiles
ORDER BY similarity_score DESC
LIMIT 100;
```

---

## ✅ Implementation Checklist

- [x] Migration 025 created with 12 new dimension columns
- [x] Added indexes for JSONB performance
- [x] Updated items table with new metadata columns
- [x] Updated fashion_influencers table with new metadata
- [x] Updated brands table with new metadata
- [x] Updated StyleProfileService to track all 16 dimensions
- [x] Created customer_profile_summary view
- [x] Created get_complete_customer_profile() function
- [ ] Update product import scripts to populate new columns
- [ ] Update influencer onboarding to collect new metadata
- [ ] Update brand onboarding to collect new metadata
- [ ] Train ML model on 16-dimensional data
- [ ] Update recommendation engine to use all dimensions
- [ ] Create admin dashboard to visualize 16D profiles

---

**Next Steps**: Run migration 025 to expand the style profile system from 4 to 16 dimensions.
