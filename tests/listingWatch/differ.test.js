const { diffListings } = require('../../src/services/listingWatch/differ');
const { listing, variant } = require('./helpers');

const row = (item, v, over = {}) => ({ item_id: item, variant_id: v, price_cents: 9800, available: true, ...over });
const state = (over = {}) => ({ variants: [], seenItemIds: new Set(['old']), lastScriptVersion: 'v1', ...over });

describe('change detection', () => {
  test('first run is a quiet baseline', () => {
    const d = diffListings({ variants: [], seenItemIds: new Set() }, { listings: [listing('a')], watchedItemIds: [], scriptVersion: 'v1' });
    expect(d.quiet).toBe('baseline');
    expect(d.events).toEqual([]);
  });

  test('a changed script re-baselines instead of alerting', () => {
    const d = diffListings(state(), { listings: [listing('new1')], watchedItemIds: [], scriptVersion: 'v2' });
    expect(d.quiet).toBe('rebaseline');
    expect(d.events).toEqual([]);
  });

  test('an unseen item is new; a seen one is not', () => {
    const d = diffListings(state(), { listings: [listing('old'), listing('fresh')], watchedItemIds: [], scriptVersion: 'v1' });
    expect(d.events.map(e => [e.type, e.itemId])).toEqual([['new_item', 'fresh']]);
  });

  test('a watched size coming back is back_in_stock', () => {
    const prev = state({ variants: [row('w', 'w1', { available: false })] });
    const d = diffListings(prev, { listings: [listing('w', [variant('w1', { size: 'S' })])], watchedItemIds: ['w'], scriptVersion: 'v1' });
    expect(d.events).toEqual([expect.objectContaining({ type: 'back_in_stock', itemId: 'w', variantId: 'w1', size: 'S' })]);
  });

  test('same markdown on every size is one price change for the item', () => {
    const prev = state({ variants: [row('w', 'w1'), row('w', 'w2')] });
    const run = { listings: [listing('w', [variant('w1', { priceCents: 7800 }), variant('w2', { priceCents: 7800, size: 'L' })])], watchedItemIds: ['w'], scriptVersion: 'v1' };
    const d = diffListings(prev, run);
    expect(d.events).toHaveLength(1);
    expect(d.events[0]).toMatchObject({ type: 'price_change', oldPriceCents: 9800, newPriceCents: 7800, variantId: null, size: null });
  });

  test('a price move over 70% is suspicious and makes a storm', () => {
    const prev = state({ variants: [row('w', 'w1')] });
    const d = diffListings(prev, { listings: [listing('w', [variant('w1', { priceCents: 980 })])], watchedItemIds: ['w'], scriptVersion: 'v1' });
    expect(d.suspicious).toHaveLength(1);
    expect(d.storm).toBe(true);
  });

  test('many new items at once is a storm', () => {
    const seen = new Set(Array.from({ length: 20 }, (_, i) => `s${i}`));
    const listings = Array.from({ length: 12 }, (_, i) => listing(`n${i}`));
    expect(diffListings(state({ seenItemIds: seen }), { listings, watchedItemIds: [], scriptVersion: 'v1' }).storm).toBe(true);
  });

  test('a watched item the store stopped returning is reported missing', () => {
    const d = diffListings(state(), { listings: [listing('old')], watchedItemIds: ['gone'], scriptVersion: 'v1' });
    expect(d.missingWatchedIds).toEqual(['gone']);
  });

  test('full detail is kept only for watched items', () => {
    const d = diffListings(state(), { listings: [listing('old'), listing('w')], watchedItemIds: ['w'], scriptVersion: 'v1' });
    expect(d.variantRows.map(r => r.itemId)).toEqual(['w']);
  });
});
