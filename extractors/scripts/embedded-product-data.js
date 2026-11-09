/**
 * No-AI fallback: read the product data most stores embed for Google
 * (schema.org Product / ProductGroup in <script type="application/ld+json">).
 *
 * A store switches to this script after its own script breaks 2 runs in a
 * row. If this passes the health test, no AI repair runs. It is shared by
 * every store that falls back to it, so a change to it never auto-merges.
 *
 * Input task: { storeKey, domain, watchedItems?: [{ itemId, url }], searchQueries }
 *   - watched items: open each saved product page and keep its itemId, so
 *     size and price watches keep working while the store is on the fallback
 *   - new drops (when searchQueries is non-empty): open the store's
 *     newest-first collection page and read up to NEW_DROP_PAGES products
 * Output: { listings } in the shape of src/services/listingWatch/contract.js.
 */

const NEW_DROP_PAGES = 12;
const MAX_WATCHED = 40;
const NEW_DROP_PATHS = ['/collections/all?sort_by=created-descending', '/collections/new-arrivals', '/collections/new'];

// Signs that we got a bot wall, not the store. Thrown as "bot check" so the
// repair gate opens an issue instead of asking AI to "fix" a captcha.
const BLOCK_RE = /(captcha|access denied|are you a robot|verify you are human|pardon our interruption|request unsuccessful|cf-chl-|perimeterx|px-captcha)/i;

function first(v) {
  return Array.isArray(v) ? v[0] : v;
}

function text(v) {
  const x = first(v);
  if (x == null) return null;
  if (typeof x === 'object') return text(x.name ?? x['@value'] ?? null);
  const s = String(x).trim();
  return s || null;
}

function imageOf(v) {
  const x = first(v);
  if (!x) return null;
  if (typeof x === 'string') return x;
  return x.url || x.contentUrl || null;
}

function absolute(url, base) {
  if (!url) return null;
  try {
    const u = new URL(String(url), base);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.toString();
  } catch {
    return null;
  }
}

function toCents(price) {
  if (price == null || price === '') return null;
  const n = typeof price === 'number' ? price : Number(String(price).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function isUsd(offer) {
  const c = offer && (offer.priceCurrency || offer.priceSpecification?.priceCurrency);
  return !c || String(c).toUpperCase() === 'USD';
}

function availabilityOf(offer) {
  const a = text(offer && offer.availability);
  if (!a) return null;
  if (/InStock|LimitedAvailability|OnlineOnly|PreOrder|BackOrder/i.test(a)) return true;
  if (/OutOfStock|SoldOut|Discontinued|InStoreOnly/i.test(a)) return false;
  return null;
}

// Price, and the "was" price when the store marks one.
function pricesOf(offer) {
  let price = toCents(offer.price ?? offer.lowPrice);
  let was = null;
  for (const spec of [].concat(offer.priceSpecification || [])) {
    if (!spec || typeof spec !== 'object') continue;
    const cents = toCents(spec.price);
    if (/StrikethroughPrice|ListPrice|MSRP/i.test(String(spec.priceType || ''))) was = cents;
    else if (price == null) price = cents;
  }
  if (was != null && (price == null || was <= price)) was = null;
  return { priceCents: price, compareAtCents: was };
}

function offersOf(node) {
  const out = [];
  for (const o of [].concat(node.offers || [])) {
    if (!o || typeof o !== 'object') continue;
    if (/AggregateOffer/.test(String(o['@type'])) && o.offers) out.push(...[].concat(o.offers));
    else out.push(o);
  }
  return out.filter(o => o && typeof o === 'object' && isUsd(o));
}

function queryParam(url, name) {
  try {
    return new URL(String(url), 'https://x.invalid').searchParams.get(name) || null;
  } catch {
    return null;
  }
}

function variantIdOf(offer, fallback) {
  const variant = queryParam(offer.url, 'variant');
  if (variant) return variant;
  return String(offer.sku || offer.gtin || offer['@id'] || fallback);
}

// One product (or product group) -> one listing in the contract's shape.
function toListing(node, { itemId, pageUrl }) {
  const name = text(node.name);
  const url = absolute(node.url || pageUrl, pageUrl);
  if (!name || !url) return null;

  const variants = [];
  // Some stores list every size/color as a bare link with no offer; then the
  // group's own offer is the only price we have, so use that instead.
  const groupVariants = [].concat(node.hasVariant || [])
    .filter(v => v && typeof v === 'object' && offersOf(v).length);
  if (groupVariants.length) {
    groupVariants.forEach((v, i) => {
      const offer = offersOf(v)[0];
      variants.push({
        variantId: variantIdOf({ ...offer, url: offer.url || v.url, sku: v.sku || offer.sku, '@id': v['@id'] || offer['@id'] }, `v${i}`),
        size: text(v.size) || queryParam(v.url, 'size'),
        color: text(v.color) || queryParam(v.url, 'color'),
        ...pricesOf(offer),
        available: availabilityOf(offer),
      });
    });
  } else {
    offersOf(node).forEach((offer, i) => {
      variants.push({
        variantId: variantIdOf(offer, `o${i}`),
        size: text(offer.size || offer.itemOffered?.size),
        color: text(offer.color || offer.itemOffered?.color || node.color),
        ...pricesOf(offer),
        available: availabilityOf(offer),
      });
    });
  }
  // Drop duplicate variant ids (some themes repeat the same offer).
  const seen = new Set();
  const unique = variants.filter(v => !seen.has(v.variantId) && seen.add(v.variantId));
  if (!unique.length || unique.every(v => v.priceCents == null)) return null;

  return {
    // Handle first: one page per color often shares one productGroupID.
    itemId: String(itemId || handleOf(url) || node.productGroupID || node.productID || url),
    name,
    url,
    brand: text(node.brand),
    imageUrl: absolute(imageOf(node.image), pageUrl),
    category: text(node.category),
    variants: unique.slice(0, 60),
  };
}

function handleOf(url) {
  const m = /\/products\/([^/?#]+)/.exec(String(url || ''));
  return m ? decodeURIComponent(m[1]) : null;
}

function productLinks(html, base, limit) {
  const links = [];
  const seen = new Set();
  for (const [, href] of String(html).matchAll(/href=["']([^"'#]*\/products\/[^"'?#]+)[^"']*["']/gi)) {
    const abs = absolute(href, base);
    const handle = handleOf(abs);
    if (!abs || !handle || seen.has(handle)) continue;
    if (new URL(abs).hostname !== new URL(base).hostname) continue;
    seen.add(handle);
    links.push(`${new URL(base).origin}/products/${encodeURIComponent(handle)}`);
    if (links.length >= limit) break;
  }
  return links;
}

function assertNotBlocked(html, url) {
  if (BLOCK_RE.test(String(html).slice(0, 20000))) throw new Error(`bot check: ${url} returned a bot check page, not the store`);
}

async function readProductPage(tools, url, itemId) {
  const html = await tools.http.getText(url);
  const nodes = tools.html.jsonLdProducts(html, url);
  if (!nodes.length) assertNotBlocked(html, url);
  // Prefer the group (all sizes) over a single variant.
  const node = nodes.find(n => [].concat(n['@type']).includes('ProductGroup')) || nodes[0];
  return node ? toListing(node, { itemId, pageUrl: url }) : null;
}

module.exports = {
  async run({ task, tools }) {
    const base = `https://${task.domain}`;
    const listings = new Map();
    let failures = 0;

    const sameStore = url => {
      try {
        return new URL(url).hostname.replace(/^www\./, '') === task.domain.replace(/^www\./, '');
      } catch {
        return false;
      }
    };
    const watched = (task.watchedItems || [])
      .filter(w => w && w.itemId && w.url && sameStore(absolute(w.url, base)))
      .slice(0, MAX_WATCHED);
    for (const w of watched) {
      try {
        const l = await readProductPage(tools, absolute(w.url, base), w.itemId);
        if (l) listings.set(l.itemId, l);
      } catch (err) {
        if (/^bot check/.test(err.message)) throw err;
        failures += 1;
        tools.log(`${task.storeKey}: ${w.url}: ${err.message}`);
      }
    }

    if ((task.searchQueries || []).length) {
      let links = [];
      for (const p of NEW_DROP_PATHS) {
        try {
          const html = await tools.http.getText(`${base}${p}`);
          links = productLinks(html, base, NEW_DROP_PAGES);
          if (!links.length) assertNotBlocked(html, `${base}${p}`);
          if (links.length) break;
        } catch (err) {
          if (/^bot check/.test(err.message)) throw err;
          tools.log(`${task.storeKey}: ${p}: ${err.message}`);
        }
      }
      for (const link of links) {
        const handle = handleOf(link);
        try {
          const l = await readProductPage(tools, link, null);
          // Watched pages keep their own ids; skip a product already read.
          if (l && ![...listings.values()].some(x => handleOf(x.url) === handle)) listings.set(l.itemId, l);
        } catch (err) {
          if (/^bot check/.test(err.message)) throw err;
          failures += 1;
        }
      }
    }

    if (failures) tools.log(`${task.storeKey}: ${failures} product pages could not be read`);
    return { listings: [...listings.values()] };
  },
  // Exposed for tests.
  toListing,
  productLinks,
};
