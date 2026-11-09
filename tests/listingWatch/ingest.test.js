jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
const { ingestRun } = require('../../src/services/listingWatch/ingest');
const { listing, variant } = require('./helpers');

function fakeStore(over = {}) {
  const s = {
    state: {
      variants: [], seenItemIds: new Set(['a']), lastScriptVersion: 'v1', lastGoodCount: 1,
      lastStatus: 'ok', runIds: new Set(), ...over,
    },
    runs: [],
    saved: [],
    loadState: jest.fn(async () => s.state),
    recordRun: jest.fn(async (key, r) => { s.runs.push(r); }),
    saveRun: jest.fn(async (key, r) => { s.saved.push(r); }),
  };
  return s;
}
const body = (over = {}) => ({
  storeKey: 'shop', runId: 'r1', scriptName: 'shopify-catalog', scriptVersion: 'v1', ok: true,
  output: { listings: [listing('a'), listing('b')] }, watchedItemIds: [], ...over,
});

describe('ingest', () => {
  test('requires storeKey and runId', async () => {
    await expect(ingestRun({}, { store: fakeStore() })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('a repeated run id is ignored', async () => {
    const store = fakeStore({ runIds: new Set(['r1']) });
    expect(await ingestRun(body(), { store })).toEqual({ storeKey: 'shop', status: 'duplicate' });
    expect(store.saveRun).not.toHaveBeenCalled();
  });

  test('a failed script is recorded as broken and nothing is saved', async () => {
    const store = fakeStore();
    const r = await ingestRun(body({ ok: false, error: 'selector missing', output: undefined }), { store });
    expect(r.status).toBe('broken');
    expect(store.runs[0]).toMatchObject({ status: 'broken' });
    expect(store.saveRun).not.toHaveBeenCalled();
  });

  test('output is checked again on the server', async () => {
    const store = fakeStore();
    const r = await ingestRun(body({ output: { listings: [{ itemId: 'x' }] } }), { store });
    expect(r.status).toBe('broken');
  });

  test('a normal run saves and queues the new item', async () => {
    const store = fakeStore();
    const r = await ingestRun(body(), { store });
    expect(r).toMatchObject({ status: 'ok', events: 1 });
    expect(store.saved[0].events).toEqual([expect.objectContaining({ type: 'new_item', itemId: 'b' })]);
  });

  test('a storm is held once, then accepted if the next run agrees', async () => {
    const store = fakeStore({ variants: [{ item_id: 'a', variant_id: 'a-v1', price_cents: 9800, available: true }] });
    const cheap = body({ output: { listings: [listing('a', [variant('a-v1', { priceCents: 900 })])] }, watchedItemIds: ['a'] });
    expect((await ingestRun(cheap, { store })).status).toBe('held');
    expect(store.saveRun).not.toHaveBeenCalled();

    store.state.lastStatus = 'held';
    expect((await ingestRun({ ...cheap, runId: 'r2' }, { store })).status).toBe('ok');
    expect(store.saved[0].events[0]).toMatchObject({ type: 'price_change', newPriceCents: 900 });
  });

  test('a changed script saves quietly as a new baseline', async () => {
    const store = fakeStore();
    const r = await ingestRun(body({ scriptVersion: 'v2' }), { store });
    expect(r.status).toBe('baseline');
    expect(store.saved[0].events).toEqual([]);
  });
});
