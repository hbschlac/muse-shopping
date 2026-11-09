/**
 * The no-AI fallback against saved pages. Uses the real tools.js with a fake
 * fetch, so the same host and budget rules apply as in the live job.
 */
const fs = require('fs');
const path = require('path');
const { createTools } = require('../../extractors/tools');
const { validateOutput } = require('../../src/services/listingWatch/contract');
const fallback = require('../../extractors/scripts/embedded-product-data');

const page = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const task = { storeKey: 'example', domain: 'www.example-store.com', endpoint: null };

function toolsFor(routes) {
  const requested = [];
  const fetchImpl = async url => {
    requested.push(url);
    const u = new URL(url);
    const key = Object.keys(routes).find(k => `${u.pathname}${u.search}` === k || u.pathname === k);
    if (!key) return { ok: false, status: 404, text: async () => 'not found' };
    return { ok: true, status: 200, text: async () => routes[key] };
  };
  const tools = createTools(task, { fetchImpl, pauseMs: 0 });
  tools.log = () => {};
  return { tools, requested };
}

test('reads a Shopify product page, one variant per offer, keeping the watched itemId', async () => {
  const { tools } = toolsFor({ '/products/womens-wool-runner': page('shopify-product.html') });
  const out = await fallback.run({
    task: { ...task, watchedItems: [{ itemId: 'gid://shopify/Product/9', url: 'https://www.example-store.com/products/womens-wool-runner' }], searchQueries: [] },
    tools,
  });
  const checked = validateOutput(out);
  expect(checked.ok).toBe(true);
  expect(checked.dropped).toBe(0);
  const [l] = checked.listings;
  expect(l.itemId).toBe('gid://shopify/Product/9');
  expect(l.brand).toBe('Example');
  expect(l.imageUrl).toBe('https://www.example-store.com/cdn/shop/files/runner.jpg');
  expect(l.variants.map(v => [v.variantId, v.priceCents, v.available])).toEqual([
    ['111', 9800, true],
    ['222', 9800, false],
  ]);
});

test('reads a ProductGroup inside @graph with sizes and a was-price', async () => {
  const { tools } = toolsFor({ '/products/silk-slip-dress': page('product-group.html') });
  const out = await fallback.run({
    task: { ...task, watchedItems: [{ itemId: 'SLIP', url: '/products/silk-slip-dress' }] },
    tools,
  });
  const { listings } = validateOutput(out);
  expect(listings[0].url).toBe('https://www.example-store.com/products/silk-slip-dress');
  expect(listings[0].variants).toEqual([
    { variantId: 'SLIP-1-XS', size: 'XS', color: 'Black', priceCents: 12000, compareAtCents: 18000, available: true },
    { variantId: 'SLIP-1-S', size: 'S', color: 'Black', priceCents: 12000, compareAtCents: null, available: false },
  ]);
});

test('new drops: follows product links on the newest-first page, same store only, no duplicates', async () => {
  const { tools, requested } = toolsFor({
    '/collections/all': page('collection.html'),
    '/products/silk-slip-dress': page('product-group.html'),
    '/products/womens-wool-runner': page('shopify-product.html'),
  });
  const out = await fallback.run({ task: { ...task, searchQueries: ['new arrivals women'] }, tools });
  const { listings } = validateOutput(out);
  expect(listings.map(l => l.itemId).sort()).toEqual(['silk-slip-dress', 'womens-wool-runner']);
  expect(requested.every(u => u.startsWith('https://www.example-store.com/'))).toBe(true);
});

test('stable ids: two runs on the same pages give the same itemIds', async () => {
  const routes = { '/collections/all': page('collection.html'), '/products/silk-slip-dress': page('product-group.html'), '/products/womens-wool-runner': page('shopify-product.html') };
  const run = async () => (await fallback.run({ task: { ...task, searchQueries: ['x'] }, tools: toolsFor(routes).tools })).listings.map(l => l.itemId);
  expect(await run()).toEqual(await run());
});

test('a bot-check page throws "bot check" so the gate opens an issue instead of an AI repair', async () => {
  const { tools } = toolsFor({ '/products/a': page('blocked.html') });
  await expect(fallback.run({ task: { ...task, watchedItems: [{ itemId: 'a', url: '/products/a' }] }, tools }))
    .rejects.toThrow(/^bot check/);
});

test('pages with no product data give no listings, not made-up ones', async () => {
  const { tools } = toolsFor({ '/products/a': '<html><body>Hello</body></html>' });
  const out = await fallback.run({ task: { ...task, watchedItems: [{ itemId: 'a', url: '/products/a' }] }, tools });
  expect(out.listings).toEqual([]);
});

test('ignores non-USD offers and offers with no price', () => {
  const l = fallback.toListing({
    '@type': 'Product', name: 'X', url: 'https://www.example-store.com/products/x',
    offers: [{ price: '10', priceCurrency: 'EUR' }, { price: '', priceCurrency: 'USD' }],
  }, { pageUrl: 'https://www.example-store.com/products/x' });
  expect(l).toBeNull();
});

test('a watched URL on another site is skipped, not fetched', async () => {
  const { tools, requested } = toolsFor({});
  const out = await fallback.run({ task: { ...task, watchedItems: [{ itemId: 'a', url: 'https://evil.example.net/products/a' }] }, tools });
  expect(out.listings).toEqual([]);
  expect(requested).toEqual([]);
});

test('a group whose variants are bare links falls back to the group offer', () => {
  const l = fallback.toListing({
    '@type': 'ProductGroup', name: 'Runner', productGroupID: 'RUN',
    offers: { '@type': 'Offer', url: 'https://www.example-store.com/products/runner-grey', price: 100, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    hasVariant: [{ '@type': 'Product', url: 'https://www.example-store.com/products/runner?size=8' }],
  }, { pageUrl: 'https://www.example-store.com/products/runner-grey' });
  expect(l.itemId).toBe('runner-grey');
  expect(l.variants).toEqual([{ variantId: 'o0', size: null, color: null, priceCents: 10000, compareAtCents: null, available: true }]);
});
