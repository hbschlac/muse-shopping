/**
 * The contract every store script in extractors/scripts must meet.
 *
 * A store script returns { listings: Listing[] }. A Listing is one product page:
 *
 *   {
 *     itemId:   string            stable id at the store (product id, handle, sku)
 *     name:     string
 *     url:      string            https link to the product page
 *     brand?:   string
 *     imageUrl?: string
 *     category?: string
 *     publishedAt?: string        ISO date the store first listed it, when known
 *     variants: [{                one per size (or one with size null)
 *       variantId:      string
 *       size:           string | null
 *       color:          string | null
 *       priceCents:     integer | null
 *       compareAtCents: integer | null   "was" price, when on sale
 *       available:      boolean | null   null = the store does not say
 *     }]
 *   }
 *
 * The runner, the server and the repair job all check output with this file,
 * so a regenerated script is held to exactly the same bar as the original.
 *
 * This file must stay dependency-free: store scripts run in a locked-down
 * process that may load only extractors/ and this file.
 */

const MAX_LISTINGS = 2000;
const MAX_VARIANTS = 60;

const isStr = v => typeof v === 'string' && v.trim().length > 0;
// Prices outside $1 to $10,000 are almost always a parsing mistake (cents read
// as dollars, a missing decimal), so they fail the contract.
const MIN_PRICE_CENTS = 100;
const MAX_PRICE_CENTS = 1_000_000;
const isCents = v => v === null || v === undefined
  || (Number.isInteger(v) && v >= MIN_PRICE_CENTS && v <= MAX_PRICE_CENTS);

function isHttpsUrl(v) {
  if (!isStr(v)) return false;
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check one script's output. Bad listings are dropped and reported; the run is
 * only rejected outright when the shape itself is wrong.
 * @returns {{ ok: boolean, listings: object[], errors: string[], dropped: number }}
 */
function validateOutput(output) {
  const errors = [];
  if (!output || !Array.isArray(output.listings)) {
    return { ok: false, listings: [], errors: ['output must be { listings: [...] }'], dropped: 0 };
  }
  if (output.listings.length > MAX_LISTINGS) {
    errors.push(`too many listings (${output.listings.length} > ${MAX_LISTINGS}); extra ones dropped`);
  }

  const listings = [];
  const seen = new Set();
  let dropped = 0;
  for (const [i, l] of output.listings.slice(0, MAX_LISTINGS).entries()) {
    const why = listingProblem(l);
    if (why) {
      dropped += 1;
      if (errors.length < 20) errors.push(`listing ${i}: ${why}`);
      continue;
    }
    const itemId = String(l.itemId);
    if (seen.has(itemId)) { dropped += 1; continue; }
    seen.add(itemId);
    listings.push(normalizeListing(l));
  }
  return { ok: true, listings, errors, dropped };
}

function listingProblem(l) {
  if (!l || typeof l !== 'object') return 'not an object';
  if (!isStr(String(l.itemId ?? ''))) return 'missing itemId';
  if (!isStr(l.name)) return 'missing name';
  if (!isHttpsUrl(l.url)) return 'url must be https';
  if (!Array.isArray(l.variants) || l.variants.length === 0) return 'needs at least one variant';
  if (l.variants.length > MAX_VARIANTS) return `too many variants (${l.variants.length})`;
  for (const v of l.variants) {
    if (!v || !isStr(String(v.variantId ?? ''))) return 'variant missing variantId';
    if (!isCents(v.priceCents) || !isCents(v.compareAtCents)) return 'prices must be whole cents between $1 and $10,000';
    if (!(v.available === true || v.available === false || v.available == null)) return 'available must be true, false or null';
  }
  return null;
}

// Store text is shown in the app and in alerts; markup in it is never wanted.
const plain = v => String(v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();

function normalizeListing(l) {
  const str = v => (isStr(v) && plain(v) ? plain(v).slice(0, 200) : null);
  return {
    itemId: String(l.itemId),
    name: plain(l.name).slice(0, 500) || String(l.itemId),
    url: l.url,
    brand: str(l.brand),
    imageUrl: isHttpsUrl(l.imageUrl) ? l.imageUrl : null,
    category: str(l.category),
    publishedAt: str(l.publishedAt),
    variants: l.variants.map(v => ({
      variantId: String(v.variantId),
      size: v.size == null ? null : plain(v.size).slice(0, 50) || null,
      color: v.color == null ? null : plain(v.color).slice(0, 80) || null,
      priceCents: v.priceCents ?? null,
      compareAtCents: v.compareAtCents ?? null,
      available: v.available ?? null,
    })),
  };
}

module.exports = { validateOutput, MAX_LISTINGS, MAX_VARIANTS, MIN_PRICE_CENTS, MAX_PRICE_CENTS };
