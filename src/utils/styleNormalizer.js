/**
 * Style Normalizer
 * Maps user language and chat intent to style profile taxonomy
 */

// Map chat intent keywords to style archetypes
const STYLE_KEYWORDS = {
  minimal: ['minimal', 'minimalist', 'clean', 'simple', 'basic', 'neutral', 'sleek', 'modern'],
  streetwear: ['streetwear', 'street', 'urban', 'casual', 'sneaker', 'hoodie', 'oversized'],
  glam: ['glam', 'glamorous', 'luxury', 'elegant', 'sophisticated', 'dressy', 'formal'],
  classic: ['classic', 'timeless', 'traditional', 'tailored', 'structured', 'refined'],
  boho: ['boho', 'bohemian', 'hippie', 'flowy', 'free-spirited', 'eclectic'],
  athleisure: ['athleisure', 'athletic', 'sporty', 'activewear', 'gym', 'yoga', 'performance'],
  romantic: ['romantic', 'feminine', 'soft', 'delicate', 'floral', 'pretty', 'vintage'],
  edgy: ['edgy', 'bold', 'rock', 'punk', 'leather', 'statement', 'daring'],
  preppy: ['preppy', 'collegiate', 'polished', 'button-down', 'blazer', 'ivy'],
  avant_garde: ['avant-garde', 'experimental', 'artistic', 'unconventional', 'unique']
};

// Map categories to category_layers
const CATEGORY_KEYWORDS = {
  bags: ['bag', 'purse', 'handbag', 'tote', 'clutch', 'backpack', 'crossbody'],
  shoes: ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'flat', 'loafer'],
  denim: ['denim', 'jean', 'denim jacket'],
  workwear: ['workwear', 'blazer', 'trouser', 'suit', 'office', 'professional'],
  occasion: ['dress', 'gown', 'cocktail', 'evening', 'formal'],
  accessories: ['accessory', 'accessories', 'jewelry', 'scarf', 'belt', 'hat'],
  active: ['active', 'activewear', 'leggings', 'sports bra', 'workout'],
  mixed: ['top', 'shirt', 'blouse', 'sweater', 'cardigan', 'jacket', 'coat']
};

// Map occasions to occasion_layers
const OCCASION_KEYWORDS = {
  work: ['work', 'office', 'professional', 'business', 'meeting'],
  event: ['event', 'wedding', 'party', 'formal', 'special occasion'],
  casual: ['casual', 'everyday', 'weekend', 'relaxed'],
  athleisure: ['gym', 'workout', 'athletic', 'active']
};

// Map price keywords to price_layers
const PRICE_KEYWORDS = {
  budget: ['budget', 'affordable', 'cheap', 'inexpensive', 'under $50'],
  mid: ['mid-range', 'moderate', 'reasonable'],
  premium: ['premium', 'quality', 'investment', 'designer'],
  luxury: ['luxury', 'high-end', 'expensive', 'splurge']
};

class StyleNormalizer {
  /**
   * Normalize chat message to style archetypes
   * @param {string} message - User's chat message
   * @returns {Array<string>} - Matched style archetypes
   */
  static normalizeToStyles(message) {
    const lowercaseMessage = message.toLowerCase();
    const matches = [];

    for (const [archetype, keywords] of Object.entries(STYLE_KEYWORDS)) {
      if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
        matches.push(archetype);
      }
    }

    return matches;
  }

  /**
   * Normalize chat message to category layers
   * @param {string} message - User's chat message
   * @returns {Array<string>} - Matched categories
   */
  static normalizeToCategories(message) {
    const lowercaseMessage = message.toLowerCase();
    const matches = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
        matches.push(category);
      }
    }

    return matches;
  }

  /**
   * Normalize chat message to occasions
   * @param {string} message - User's chat message
   * @returns {Array<string>} - Matched occasions
   */
  static normalizeToOccasions(message) {
    const lowercaseMessage = message.toLowerCase();
    const matches = [];

    for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
      if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
        matches.push(occasion);
      }
    }

    return matches;
  }

  /**
   * Normalize chat message to price tier
   * @param {string} message - User's chat message
   * @returns {string|null} - Matched price tier or null
   */
  static normalizeToPriceTier(message) {
    const lowercaseMessage = message.toLowerCase();

    for (const [tier, keywords] of Object.entries(PRICE_KEYWORDS)) {
      if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
        return tier;
      }
    }

    return null;
  }

  /**
   * Extract style signals from chat intent
   * @param {Object} intent - Chat intent object with filters
   * @returns {Object} - Normalized style signals
   */
  static extractStyleSignals(intent, message) {
    return {
      styles: this.normalizeToStyles(message),
      categories: this.normalizeToCategories(message),
      occasions: this.normalizeToOccasions(message),
      priceTier: this.normalizeToPriceTier(message)
    };
  }
}

module.exports = StyleNormalizer;
