const { assessRun } = require('../../src/services/listingWatch/health');
const { listing } = require('./helpers');

const many = n => Array.from({ length: n }, (_, i) => listing(`i${i}`));

describe('run health', () => {
  test('a failed script is broken', () => {
    expect(assessRun({ ok: false, error: 'boom', listings: [] }, {})).toMatchObject({ healthy: false });
  });
  test('zero listings is broken', () => {
    expect(assessRun({ ok: true, listings: [], dropped: 0 }, {}).healthy).toBe(false);
  });
  test('a big drop against the last good run is broken', () => {
    expect(assessRun({ ok: true, listings: many(5), dropped: 0 }, { lastGoodCount: 50 }).healthy).toBe(false);
    expect(assessRun({ ok: true, listings: many(30), dropped: 0 }, { lastGoodCount: 50 }).healthy).toBe(true);
  });
  test('mostly unpriced listings are broken', () => {
    const unpriced = many(10).map(l => ({ ...l, variants: l.variants.map(v => ({ ...v, priceCents: null })) }));
    expect(assessRun({ ok: true, listings: unpriced, dropped: 0 }, {}).healthy).toBe(false);
  });
  test('a normal run is healthy', () => {
    expect(assessRun({ ok: true, listings: many(10), dropped: 1 }, { lastGoodCount: 10 }).healthy).toBe(true);
  });
});
