class ChatTaxonomyService {
  static canonicalizeColor(color) {
    if (!color) return null;
    const c = String(color).toLowerCase();
    const map = {
      grey: 'gray',
      charcoal: 'gray',
      offwhite: 'white',
      ivory: 'white',
      burgundy: 'red',
      navy: 'blue'
    };
    return map[c] || c;
  }

  static canonicalizeSize(size) {
    if (!size) return null;
    return String(size).trim().toUpperCase();
  }

  static canonicalizeOccasion(occasion) {
    if (!occasion) return null;
    const o = String(occasion).toLowerCase();
    const map = {
      wedding: 'event',
      formal: 'event',
      workwear: 'work',
      office: 'work',
      gym: 'athleisure'
    };
    return map[o] || o;
  }

  static canonicalizeMaterial(material) {
    if (!material) return null;
    const m = String(material).toLowerCase();
    const map = {
      denim: 'denim',
      jean: 'denim',
      cotton: 'cotton',
      linen: 'linen',
      silk: 'silk',
      leather: 'leather',
      fauxleather: 'leather',
      suede: 'suede',
      wool: 'wool',
      cashmere: 'cashmere',
      polyester: 'poly',
      nylon: 'nylon',
      rayon: 'viscose',
      viscose: 'viscose',
    };
    return map[m] || m;
  }

  static canonicalizeFit(fit) {
    if (!fit) return null;
    const f = String(fit).toLowerCase();
    const map = {
      oversized: 'relaxed',
      boxy: 'relaxed',
      slim: 'slim',
      skinny: 'slim',
      relaxed: 'relaxed',
      tailored: 'tailored',
    };
    return map[f] || f;
  }
}

module.exports = ChatTaxonomyService;
