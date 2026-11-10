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
    overrides: [],
    trials: [],
    deleted: [],
    loadState: jest.fn(async () => s.state),
    setOverride: jest.fn(async (key, script, reason) => { s.overrides.push({ key, script, reason }); }),
    deleteOverride: jest.fn(async key => { s.deleted.push(key); return true; }),
    recordTrial: jest.fn(async (key, error) => { s.trials.push({ key, error }); }),
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

  test('a second broken run in a row by the same script switches the store to the fallback', async () => {
    const failed = body({ ok: false, error: 'boom', output: undefined });
    const store = fakeStore({ recentRuns: [{ status: 'ok', scriptName: 'shopify-catalog' }] });
    expect(await ingestRun(failed, { store })).toMatchObject({ status: 'broken', streak: 1, fallback: false });
    expect(store.setOverride).not.toHaveBeenCalled();

    store.state.recentRuns = [{ status: 'broken', scriptName: 'shopify-catalog' }];
    expect(await ingestRun({ ...failed, runId: 'r2' }, { store })).toMatchObject({ status: 'broken', streak: 2, fallback: true });
    expect(store.overrides).toEqual([expect.objectContaining({ key: 'shop', script: 'embedded-product-data' })]);
  });

  test('broken runs by an earlier script do not count against a new one', async () => {
    const store = fakeStore({ recentRuns: [{ status: 'broken', scriptName: 'shopify-catalog' }] });
    const r = await ingestRun(body({ ok: false, error: 'boom', scriptName: 'shop', output: undefined }), { store });
    expect(r).toMatchObject({ streak: 1, fallback: false });
  });

  test('the fallback breaking twice does not switch to itself', async () => {
    const store = fakeStore({ recentRuns: [{ status: 'broken', scriptName: 'embedded-product-data' }] });
    const r = await ingestRun(body({ ok: false, error: 'bot check: 403', scriptName: 'embedded-product-data', output: undefined }), { store });
    expect(r).toMatchObject({ status: 'broken', streak: 2, fallback: false });
    expect(store.setOverride).not.toHaveBeenCalled();
  });

  test('a broken trial is only noted on the override', async () => {
    const store = fakeStore();
    const r = await ingestRun(body({ trial: true, ok: false, error: 'lookup_catalog: Internal error', output: undefined }), { store });
    expect(r).toMatchObject({ status: 'trial_broken', scriptName: 'shopify-catalog' });
    expect(store.trials).toEqual([{ key: 'shop', error: 'script failed: lookup_catalog: Internal error' }]);
    expect(store.recordRun).not.toHaveBeenCalled();
    expect(store.deleteOverride).not.toHaveBeenCalled();
  });

  test('a healthy trial clears the fallback and is saved', async () => {
    const store = fakeStore({ lastScriptVersion: 'fallback-v' });
    const r = await ingestRun(body({ trial: true, scriptVersion: 'v1' }), { store });
    expect(store.deleted).toEqual(['shop']);
    expect(r).toMatchObject({ status: 'baseline', fallbackCleared: true });
  });

  test('a changed script saves quietly as a new baseline', async () => {
    const store = fakeStore();
    const r = await ingestRun(body({ scriptVersion: 'v2' }), { store });
    expect(r.status).toBe('baseline');
    expect(store.saved[0].events).toEqual([]);
  });
});
