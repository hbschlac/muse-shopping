/**
 * Compare a store's saved state with a fresh run and name what changed.
 *
 * Events (the change_type values in listing_changes):
 *   new_item       an item id Muse has never seen at this store
 *   price_change   a watched size's price moved
 *   back_in_stock  a watched size that was sold out (or missing) is available again
 *
 * Pure function: no database, no network.
 *
 * What Muse keeps, to stay inside Shopify's Catalog rules (price and stock may
 * be cached for at most 15 minutes, no bulk copies):
 *   - full price and stock only for watched items, overwritten every run
 *   - only item ids and first-seen dates for everything else
 *
 * Quiet cases (no events, state is still saved):
 *   - baseline: the store has never run, so every item would look new
 *   - re-baseline: the store script changed (a repair or the fallback), and a
 *     new script often names items differently
 */

// One run moving this share of a store's watched sizes, or more than this many
// items appearing at once, looks like a broken script rather than real news.
const STORM_SHARE = 0.25;
const STORM_MIN_EVENTS = 10;
// A single price move this large is held for a second run to confirm.
const SUSPICIOUS_PRICE_MOVE = 0.7;

const key = (itemId, variantId) => `${itemId}\u0000${variantId}`;

/**
 * @param {Object} prev
 * @param {Array<{item_id, variant_id, price_cents, available}>} prev.variants - saved rows for watched items
 * @param {Set<string>|string[]} prev.seenItemIds - every item id seen at this store
 * @param {string|null} prev.lastScriptVersion - script version of the last saved run
 * @param {Object} run
 * @param {Array} run.listings - validated listings (contract.validateOutput)
 * @param {string[]} run.watchedItemIds - item ids the plan asked the script to look up
 * @param {string|null} run.scriptVersion
 * @returns {{
 *   quiet: null|'baseline'|'rebaseline',
 *   events: object[],
 *   suspicious: string[],
 *   storm: boolean,
 *   variantRows: object[],
 *   missingWatchedIds: string[],
 * }}
 */
function diffListings(prev, run) {
  const seen = prev.seenItemIds instanceof Set ? prev.seenItemIds : new Set(prev.seenItemIds || []);
  const watched = new Set((run.watchedItemIds || []).map(String));
  const prevVariants = new Map((prev.variants || []).map(r => [key(r.item_id, r.variant_id), r]));

  let quiet = null;
  if (seen.size === 0 && prevVariants.size === 0) quiet = 'baseline';
  else if (prev.lastScriptVersion && run.scriptVersion && prev.lastScriptVersion !== run.scriptVersion) quiet = 'rebaseline';

  const events = [];
  const suspicious = [];
  const variantRows = [];
  const returnedIds = new Set();

  for (const l of run.listings) {
    returnedIds.add(l.itemId);
    const base = { itemId: l.itemId, name: l.name, url: l.url, imageUrl: l.imageUrl, brand: l.brand };

    if (!seen.has(l.itemId) && !watched.has(l.itemId)) {
      const prices = l.variants.map(v => v.priceCents).filter(p => p != null);
      events.push({ type: 'new_item', ...base, variantId: null, size: null, oldPriceCents: null, newPriceCents: prices.length ? Math.min(...prices) : null });
    }

    if (!watched.has(l.itemId)) continue;

    for (const v of l.variants) {
      variantRows.push({ itemId: l.itemId, ...base, ...v });
      const before = prevVariants.get(key(l.itemId, v.variantId));
      if (!before) continue; // a size Muse had not seen yet: nothing to compare

      const oldPrice = before.price_cents == null ? null : Number(before.price_cents);
      if (oldPrice != null && v.priceCents != null && oldPrice !== v.priceCents) {
        if (Math.abs(v.priceCents - oldPrice) / oldPrice > SUSPICIOUS_PRICE_MOVE) {
          suspicious.push(`${l.itemId} ${v.size || v.variantId}: ${oldPrice} -> ${v.priceCents}`);
        }
        events.push({
          type: 'price_change', ...base, variantId: v.variantId, size: v.size, color: v.color,
          oldPriceCents: oldPrice, newPriceCents: v.priceCents,
        });
      }
      if (before.available === false && v.available === true) {
        events.push({
          type: 'back_in_stock', ...base, variantId: v.variantId, size: v.size, color: v.color,
          oldPriceCents: null, newPriceCents: v.priceCents,
        });
      }
    }
  }

  // A watched item the store no longer returns is sold out or taken down.
  // Marking it unavailable is what lets its return fire back_in_stock.
  const missingWatchedIds = [...watched].filter(id => !returnedIds.has(id));

  const merged = collapsePriceChanges(events);
  const priceAndStock = merged.filter(e => e.type !== 'new_item').length;
  const newItems = merged.length - priceAndStock;
  const watchedSizes = Math.max(variantRows.length, 1);
  const storm = suspicious.length > 0
    || (priceAndStock >= STORM_MIN_EVENTS && priceAndStock / watchedSizes > STORM_SHARE)
    || (seen.size > 0 && newItems >= STORM_MIN_EVENTS && newItems / seen.size > STORM_SHARE);

  return {
    quiet,
    events: quiet ? [] : merged,
    suspicious,
    storm: quiet ? false : storm,
    variantRows,
    missingWatchedIds,
  };
}

/**
 * When every size of an item moves to the same price (the usual markdown),
 * report it once for the item instead of once per size.
 */
function collapsePriceChanges(events) {
  const groups = new Map();
  const out = [];
  for (const e of events) {
    if (e.type !== 'price_change') { out.push(e); continue; }
    const k = `${e.itemId}\u0000${e.oldPriceCents}\u0000${e.newPriceCents}`;
    const g = groups.get(k);
    if (g) g.count += 1;
    else {
      const ng = { ...e, count: 1 };
      groups.set(k, ng);
      out.push(ng);
    }
  }
  return out.map(e => {
    if (e.type !== 'price_change') return e;
    const { count, ...rest } = e;
    return count === 1 ? rest : { ...rest, variantId: null, size: null, color: null };
  });
}

module.exports = { diffListings, STORM_SHARE, STORM_MIN_EVENTS, SUSPICIOUS_PRICE_MOVE };
