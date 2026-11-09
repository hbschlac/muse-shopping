/**
 * Shopify store, read through Shopify's agent Catalog (UCP).
 *
 * Input task: { storeKey, domain, endpoint, watchedItemIds, searchQueries }
 *   - watched items are looked up by id: full price and stock per size
 *   - each search query returns recent items; any id Muse has never seen
 *     becomes a "new item"
 * Output: { listings } in the shape of src/services/listingWatch/contract.js.
 *
 * Shopify's rules: price and stock may be kept 15 minutes, no bulk copies.
 * This script never pages through a whole catalog.
 */

const SEARCH_LIMIT = 50;

const SIZE_RE = /^(size|taille|talla|us size|shoe size)$/i;
const COLOR_RE = /^(colou?r|shade|wash)$/i;

function optionValue(variant, re) {
  const o = (variant.options || []).find(x => x && re.test(String(x.name || '')));
  return o ? String(o.label ?? o.value ?? '').trim() || null : null;
}

function cents(money) {
  return money && Number.isInteger(money.amount) && money.amount > 0 ? money.amount : null;
}

function toListing(p, task) {
  const variants = (p.variants || []).map(v => {
    const price = cents(v.price);
    const listPrice = cents(v.list_price);
    return {
      variantId: String(v.id),
      size: optionValue(v, SIZE_RE) || ((v.options || []).length === 1 ? optionValue(v, /.*/) : null),
      color: optionValue(v, COLOR_RE),
      priceCents: price,
      compareAtCents: listPrice && price && listPrice > price ? listPrice : null,
      available: v.availability ? !!v.availability.available : null,
    };
  });
  const image = (p.media || []).find(m => m && m.type === 'image')?.url
    || (p.variants || []).flatMap(v => v.media || []).find(m => m && m.type === 'image')?.url
    || null;
  return {
    itemId: String(p.id),
    name: p.title,
    url: p.url || (p.handle ? `https://${task.domain}/products/${p.handle}` : null),
    brand: p.vendor || null,
    imageUrl: image,
    variants,
  };
}

module.exports = {
  async run({ task, tools }) {
    const listings = new Map();

    if (task.watchedItemIds && task.watchedItemIds.length) {
      const { products, notFound } = await tools.ucp.lookup(task.watchedItemIds);
      for (const p of products) listings.set(String(p.id), toListing(p, task));
      if (notFound.length) tools.log(`${task.storeKey}: ${notFound.length} watched items not found`);
    }

    for (const q of task.searchQueries || []) {
      const { products } = await tools.ucp.search(q, { limit: SEARCH_LIMIT });
      for (const p of products) {
        if (!listings.has(String(p.id))) listings.set(String(p.id), toListing(p, task));
      }
    }

    return { listings: [...listings.values()] };
  },
};
