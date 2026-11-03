/**
 * Rule-based metadata tagger for bridge products.
 *
 * Turns a product's title, description and variant options into Muse's own
 * tags: category, colors, materials, silhouette, occasion, fit and sizes in
 * stock. Deterministic and free to run (no model calls), so it can tag every
 * search result live. Vocabulary reuses ChatTaxonomyService's canonical forms
 * so tags line up with the style profile.
 */

const ChatTaxonomyService = require('../chatTaxonomyService');

// First match wins, so more specific categories come first.
const CATEGORY_RULES = [
  ['swim', /\b(bikini|swimsuit|one[- ]piece|swim(wear)?|rash guard)\b/],
  ['intimates', /\b(bra|bralette|thong|brief|underwear|panty|panties|lingerie|shapewear|bodysuit)\b/],
  ['jumpsuit', /\b(jumpsuit|romper|playsuit|catsuit|unitard)\b/],
  ['dress', /\b(dress|gown|slip dress)\b/],
  ['skirt', /\b(skirt|skort)\b/],
  ['jeans', /\b(jeans?|denim pant)\b/],
  ['pants', /\b(pants?|trousers?|leggings?|joggers?|sweatpants?|chinos?|culottes?)\b/],
  ['shorts', /\bshorts?\b/],
  ['outerwear', /\b(coat|jacket|blazer|trench|parka|puffer|vest|gilet|anorak)\b/],
  ['knitwear', /\b(sweater|cardigan|pullover|jumper|knit|turtleneck)\b/],
  ['top', /\b(top|tee|t-shirt|shirt|blouse|tank|cami|camisole|polo|henley|corset|bodice|sweatshirt|hoodie)\b/],
  ['shoes', /\b(sneakers?|runners?|trainers?|boots?|booties?|heels?|pumps?|sandals?|mules?|loafers?|flats?|slides?|clogs?|slippers?|espadrilles?|shoes?)\b/],
  ['bag', /\b(bag|tote|clutch|crossbody|handbag|purse|backpack|satchel|wallet|pouch)\b/],
  ['jewelry', /\b(earrings?|hoops?|studs?|necklace|pendant|bracelet|bangle|ring|anklet|charm|huggies?)\b/],
  ['accessories', /\b(hat|cap|beanie|scarf|belt|sunglasses|hair clip|claw clip|headband|gloves?|socks?)\b/],
  ['beauty', /\b(lip|lipstick|gloss|mascara|blush|bronzer|foundation|concealer|serum|moisturi[sz]er|cleanser|toner|sunscreen|spf|shampoo|conditioner|perfume|fragrance|eau de|eyeliner|highlighter|palette|balm)\b/],
];

const COLOR_WORDS = [
  'black', 'white', 'ivory', 'cream', 'beige', 'tan', 'camel', 'brown', 'chocolate', 'gray', 'grey', 'charcoal',
  'navy', 'blue', 'denim', 'green', 'olive', 'sage', 'khaki', 'red', 'burgundy', 'wine', 'pink', 'blush', 'rose',
  'purple', 'lilac', 'lavender', 'yellow', 'butter', 'orange', 'rust', 'gold', 'silver', 'nude', 'multi',
  'leopard', 'floral', 'stripe', 'striped', 'plaid', 'gingham', 'polka',
];
const COLOR_CANON = {
  ivory: 'white', cream: 'white', grey: 'gray', charcoal: 'gray', navy: 'blue', denim: 'blue', burgundy: 'red',
  wine: 'red', blush: 'pink', rose: 'pink', lilac: 'purple', lavender: 'purple', butter: 'yellow', rust: 'orange',
  camel: 'tan', chocolate: 'brown', olive: 'green', sage: 'green', khaki: 'green', nude: 'beige', striped: 'stripe',
};
const PATTERNS = new Set(['leopard', 'floral', 'stripe', 'plaid', 'gingham', 'polka', 'multi']);

const MATERIAL_RULES = [
  ['cashmere', /\bcashmere\b/], ['wool', /\b(wool|merino|alpaca|mohair)\b/], ['linen', /\blinen\b/],
  ['silk', /\b(silk|satin)\b/], ['cotton', /\b(cotton|poplin|jersey|terry|fleece)\b/], ['denim', /\bdenim\b/],
  ['leather', /\b(leather|faux leather|vegan leather)\b/], ['suede', /\bsuede\b/], ['knit', /\b(knit|ribbed|rib)\b/],
  ['lace', /\blace\b/], ['sequin', /\b(sequin|sequins|beaded)\b/], ['nylon', /\b(nylon|recycled nylon)\b/],
  ['viscose', /\b(viscose|rayon|modal|tencel|lyocell)\b/], ['poly', /\bpolyester\b/], ['spandex', /\b(spandex|elastane|lycra)\b/],
  ['gold', /\b(14k|18k|solid gold|gold vermeil|vermeil|gold filled|gold-plated|gold plated)\b/],
  ['sterling silver', /\bsterling\b/],
];

const SILHOUETTE_RULES = [
  ['mini', /\bmini\b/], ['midi', /\bmidi\b/], ['maxi', /\b(maxi|long dress|floor[- ]length|column dress)\b/], ['wide-leg', /\bwide[- ]leg\b/],
  ['straight', /\bstraight\b/], ['skinny', /\bskinny\b/], ['flare', /\b(flare|flared|bootcut)\b/],
  ['barrel', /\b(barrel|balloon)\b/], ['wrap', /\bwrap\b/], ['slip', /\bslip\b/], ['bodycon', /\bbodycon\b/],
  ['a-line', /\ba-line\b/], ['strapless', /\bstrapless\b/], ['halter', /\bhalter\b/], ['one-shoulder', /\bone[- ]shoulder\b/],
  ['cropped', /\b(crop|cropped)\b/], ['high-rise', /\bhigh[- ](rise|waist(ed)?)\b/], ['low-rise', /\blow[- ]rise\b/],
  ['platform', /\bplatform\b/], ['kitten heel', /\bkitten\b/],
];

const FIT_RULES = [
  ['relaxed', /\b(relaxed|oversized|boxy|slouchy|loose)\b/], ['slim', /\b(slim|fitted|skinny)\b/],
  ['tailored', /\btailored\b/], ['stretch', /\bstretch\b/],
];

const OCCASION_RULES = [
  ['event', /\b(gown|cocktail|wedding|evening|formal|sequin|party|gala)\b/],
  ['work', /\b(blazer|trouser|tailored|suit|office|workwear|button[- ]down)\b/],
  ['vacation', /\b(linen|resort|beach|vacation|sundress|swim|bikini|cover[- ]up|sarong|espadrille)\b/],
  ['athleisure', /\b(legging|sports bra|yoga|running|workout|active|training|tennis|golf)\b/],
  ['lounge', /\b(lounge|sleep|pajama|robe|sweatpant|jogger)\b/],
  ['going out', /\b(corset|mini dress|bodycon|going out|club)\b/],
];

function textOf(product) {
  return `${product.title || ''} ${product.description || ''}`.toLowerCase();
}

function matchAll(rules, text) {
  return rules.filter(([, re]) => re.test(text)).map(([tag]) => tag);
}

function canonColor(word) {
  const w = String(word || '').toLowerCase().trim();
  return COLOR_CANON[w] || ChatTaxonomyService.canonicalizeColor(w);
}

function colorsFrom(product) {
  const found = new Set();
  // Variant Color/Colour options are the most reliable source.
  for (const v of product.variants || []) {
    for (const [name, label] of Object.entries(v.options || {})) {
      if (/colou?r/i.test(name) && label) {
        for (const word of String(label).toLowerCase().split(/[^a-z]+/)) {
          if (COLOR_WORDS.includes(word)) found.add(canonColor(word));
        }
      }
    }
  }
  // Titles often carry the color ("... | OBSIDIAN", "... - Natural Black").
  const title = String(product.title || '').toLowerCase();
  for (const word of title.split(/[^a-z]+/)) {
    if (COLOR_WORDS.includes(word)) found.add(canonColor(word));
  }
  const colors = [...found].filter(c => !PATTERNS.has(c));
  const patterns = [...found].filter(c => PATTERNS.has(c));
  return { colors, patterns };
}

function sizesInStock(product) {
  const sizes = new Set();
  for (const v of product.variants || []) {
    if (v.available === false) continue;
    for (const [name, label] of Object.entries(v.options || {})) {
      if (/size/i.test(name) && label) sizes.add(ChatTaxonomyService.canonicalizeSize(label));
    }
  }
  return [...sizes];
}

/**
 * @param {Object} product - a normalized bridge product (see ucpBridge.normalizeProduct)
 * @returns {{category: string|null, colors: string[], patterns: string[], materials: string[],
 *            silhouette: string[], fit: string[], occasion: string[], sizesInStock: string[], onSale: boolean}}
 */
function tagProduct(product) {
  const text = textOf(product);
  const titleText = String(product.title || '').toLowerCase();
  // Category from the title first; descriptions mention other garments ("pair with jeans").
  const category = (CATEGORY_RULES.find(([, re]) => re.test(titleText))
    || CATEGORY_RULES.find(([, re]) => re.test(text)) || [null])[0];
  const { colors, patterns } = colorsFrom(product);
  const price = product.price?.cents;
  const compareAt = product.compareAtPrice?.cents;

  return {
    category,
    colors,
    patterns,
    materials: matchAll(MATERIAL_RULES, text),
    silhouette: matchAll(SILHOUETTE_RULES, titleText),
    fit: matchAll(FIT_RULES, text),
    occasion: matchAll(OCCASION_RULES, text),
    sizesInStock: sizesInStock(product),
    onSale: !!(price && compareAt && compareAt > price),
  };
}

/**
 * Does a tagged product satisfy simple filters?
 * @param {Object} product - product with .tags
 * @param {Object} filters - { category, color, material, occasion, size, maxPriceCents, inStockOnly }
 */
function matchesFilters(product, filters = {}) {
  const t = product.tags || {};
  if (filters.category && t.category !== filters.category) return false;
  if (filters.color && !t.colors?.includes(canonColor(filters.color))) return false;
  if (filters.material && !t.materials?.includes(String(filters.material).toLowerCase())) return false;
  if (filters.occasion && !t.occasion?.includes(String(filters.occasion).toLowerCase())) return false;
  if (filters.size && !t.sizesInStock?.includes(ChatTaxonomyService.canonicalizeSize(filters.size))) return false;
  if (filters.maxPriceCents && product.price && product.price.cents > filters.maxPriceCents) return false;
  if (filters.inStockOnly && product.available === false) return false;
  return true;
}

module.exports = { tagProduct, matchesFilters };
