const ChatTaxonomyService = require('./chatTaxonomyService');

class ChatNormalizationService {
  static normalizeCategoryList(categories = []) {
    return Array.from(new Set(
      categories
        .filter(Boolean)
        .map((c) => ChatTaxonomyService.canonicalizeColor(String(c).trim()))
        .filter(Boolean)
    ));
  }

  static normalizeAttributes(attributes = []) {
    return Array.from(new Set(
      attributes
        .filter(Boolean)
        .map((a) => String(a).trim().toLowerCase())
        .filter(Boolean)
    ));
  }

  static normalizePriceRange({ min = null, max = null } = {}) {
    const normalized = {};
    if (typeof min === 'number') normalized.min = Math.max(0, Math.round(min * 100));
    if (typeof max === 'number') normalized.max = Math.max(0, Math.round(max * 100));
    return normalized;
  }

  static normalizeColors(colors = []) {
    return Array.from(new Set(
      colors
        .filter(Boolean)
        .map((c) => ChatTaxonomyService.canonicalizeColor(String(c).trim()))
        .filter(Boolean)
    ));
  }

  static normalizeSizes(sizes = []) {
    return Array.from(new Set(
      sizes
        .filter(Boolean)
        .map((s) => ChatTaxonomyService.canonicalizeSize(String(s).trim()))
        .filter(Boolean)
    ));
  }

  static normalizeOccasions(occasions = []) {
    return Array.from(new Set(
      occasions
        .filter(Boolean)
        .map((o) => ChatTaxonomyService.canonicalizeOccasion(String(o).trim()))
        .filter(Boolean)
    ));
  }

  static normalizeMaterials(materials = []) {
    return Array.from(new Set(
      materials
        .filter(Boolean)
        .map((m) => ChatTaxonomyService.canonicalizeMaterial(String(m).trim()))
        .filter(Boolean)
    ));
  }

  static normalizeFits(fits = []) {
    return Array.from(new Set(
      fits
        .filter(Boolean)
        .map((f) => ChatTaxonomyService.canonicalizeFit(String(f).trim()))
        .filter(Boolean)
    ));
  }
}

module.exports = ChatNormalizationService;
