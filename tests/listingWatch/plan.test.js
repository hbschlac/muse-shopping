jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../../src/services/agentBridges', () => ({ listPartners: jest.fn(() => []) }));
jest.mock('../../src/services/listingWatch/store', () => ({ getOverrides: jest.fn(async () => new Map()) }));
jest.mock('../../src/services/listingWatch/followedStores', () => ({ followersByStoreKey: jest.fn(async () => new Map()) }));
const { buildPlan, NEW_DROP_QUERIES } = require('../../src/services/listingWatch/plan');

const partners = [
  { key: 'allbirds', domain: 'www.allbirds.com', endpoint: 'https://weareallbirds.myshopify.com/api/ucp/mcp' },
  { key: 'rothys', domain: 'rothys.com', endpoint: 'https://rothys.myshopify.com/api/ucp/mcp' },
  { key: 'noendpoint', domain: 'x.com', endpoint: null },
];
const deps = over => ({
  listPartners: () => partners,
  loadWatches: async () => [],
  followersByStoreKey: async () => new Map(),
  getOverrides: async () => new Map(),
  getWatchedUrls: async () => new Map(),
  ...over,
});

describe('refresh plan', () => {
  test('nothing watched or followed means nothing to do', async () => {
    expect(await buildPlan({ deps: deps() })).toEqual([]);
  });

  test('watched items are looked up; followed stores get new-drop searches', async () => {
    const tasks = await buildPlan({
      deps: deps({
        loadWatches: async () => [
          { store_key: 'allbirds', item_id: 'gid://shopify/Product/1', variant_id: null },
          { store_key: 'allbirds', item_id: 'gid://shopify/Product/1', variant_id: '9' },
          { store_key: 'unknown', item_id: '5' },
        ],
        followersByStoreKey: async () => new Map([['rothys', [{ userId: 1 }]], ['noendpoint', [{ userId: 2 }]]]),
      }),
    });
    expect(tasks).toEqual([
      expect.objectContaining({ storeKey: 'allbirds', script: 'shopify-catalog', watchedItemIds: ['gid://shopify/Product/1'], searchQueries: [] }),
      expect.objectContaining({ storeKey: 'rothys', watchedItemIds: [], searchQueries: NEW_DROP_QUERIES }),
    ]);
  });

  test('a store override swaps in another script', async () => {
    const tasks = await buildPlan({
      extraStores: ['rothys'],
      deps: deps({ getOverrides: async () => new Map([['rothys', { script: 'rothys-html' }]]) }),
    });
    expect(tasks[0].script).toBe('rothys-html');
  });

  test('watched items carry their last saved URL for the fallback', async () => {
    const tasks = await buildPlan({
      deps: deps({
        loadWatches: async () => [{ store_key: 'allbirds', item_id: 'a' }, { store_key: 'allbirds', item_id: 'b' }],
        getWatchedUrls: async keys => new Map(keys.includes('allbirds') ? [['allbirds\u0000a', 'https://www.allbirds.com/products/a']] : []),
      }),
    });
    expect(tasks[0].watchedItems).toEqual([
      { itemId: 'a', url: 'https://www.allbirds.com/products/a' },
      { itemId: 'b', url: null },
    ]);
  });

  test('a store on the fallback for a day gets one trial of its own script', async () => {
    const now = Date.parse('2026-11-10T12:00:00Z');
    const fallback = over => new Map([['rothys', { script: 'embedded-product-data', set_at: '2026-11-09T11:00:00Z', last_trial_at: null, ...over }]]);
    const plan = over => buildPlan({ now, extraStores: ['rothys'], deps: deps({ getOverrides: async () => fallback(over) }) });

    const due = await plan({});
    expect(due.map(t => [t.script, !!t.trial])).toEqual([['embedded-product-data', false], ['shopify-catalog', true]]);
    expect(due[1].searchQueries).toEqual(due[0].searchQueries);

    expect(await plan({ set_at: '2026-11-10T00:00:00Z' })).toHaveLength(1); // on the fallback < 24h
    expect(await plan({ last_trial_at: '2026-11-10T01:00:00Z' })).toHaveLength(1); // tried today
  });

  test('the plan carries no secrets', async () => {
    const tasks = await buildPlan({ extraStores: ['allbirds'], deps: deps() });
    expect(Object.keys(tasks[0]).sort()).toEqual(['domain', 'endpoint', 'script', 'searchQueries', 'storeKey', 'watchedItemIds', 'watchedItems']);
  });
});
