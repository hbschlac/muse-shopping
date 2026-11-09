const path = require('path');
const { createTools, jsonLdProducts } = require('../../extractors/tools');
const fs = require('fs');
const { runTask, resolveScript, scriptPath, SCRIPTS_DIR } = require('../../extractors/run-one');
const shopifyCatalog = require('../../extractors/scripts/shopify-catalog');
const { validateOutput } = require('../../src/services/listingWatch/contract');

const task = {
  storeKey: 'allbirds',
  domain: 'www.allbirds.com',
  endpoint: 'https://weareallbirds.myshopify.com/api/ucp/mcp',
  script: 'shopify-catalog',
  watchedItemIds: [],
  searchQueries: [],
};

// A product shaped like Shopify Catalog's lookup_catalog / search_catalog output.
const product = (n, over = {}) => ({
  id: `gid://shopify/Product/${n}`,
  title: `Tree Runner ${n}`,
  url: `https://www.allbirds.com/products/tree-runner-${n}`,
  media: [{ type: 'image', url: `https://cdn.shopify.com/${n}.jpg` }],
  options: [{ name: 'Size', values: ['8', '9'] }],
  variants: [
    { id: `gid://shopify/ProductVariant/${n}1`, price: { amount: 9800, currency: 'USD' }, list_price: { amount: 12000, currency: 'USD' },
      availability: { available: true }, options: [{ name: 'Size', label: '8' }, { name: 'Color', label: 'Navy' }] },
    { id: `gid://shopify/ProductVariant/${n}2`, price: { amount: 9800, currency: 'USD' }, list_price: { amount: 0, currency: 'USD' },
      availability: { available: false }, options: [{ name: 'Size', label: '9' }, { name: 'Color', label: 'Navy' }] },
  ],
  ...over,
});

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const out = await handler(url, init, calls[calls.length - 1].body);
    return { ok: true, status: 200, json: async () => out, text: async () => (typeof out === 'string' ? out : JSON.stringify(out)) };
  };
  fn.calls = calls;
  return fn;
}
const rpc = structured => ({ jsonrpc: '2.0', id: 1, result: { structuredContent: structured } });

describe('store script tools', () => {
  test('only reach the task\'s own store, over https', async () => {
    const tools = createTools(task, { fetchImpl: fakeFetch(() => 'ok'), pauseMs: 0 });
    await expect(tools.http.getText('https://evil.example/x')).rejects.toThrow(/not this store/);
    await expect(tools.http.getText('http://www.allbirds.com/x')).rejects.toThrow(/https/);
    await expect(tools.http.getText('https://allbirds.com/x')).resolves.toBe('ok');
  });

  test('stop at the request budget', async () => {
    const tools = createTools(task, { fetchImpl: fakeFetch(() => 'ok'), pauseMs: 0, maxRequests: 2 });
    await tools.http.getText('https://www.allbirds.com/a');
    await tools.http.getText('https://www.allbirds.com/b');
    await expect(tools.http.getText('https://www.allbirds.com/c')).rejects.toThrow(/budget/);
  });

  test('lookup batches ids 10 at a time, sends the Muse profile, and reports not found', async () => {
    const fetchImpl = fakeFetch((url, init, body) => rpc({
      products: body.params.arguments.catalog.ids.filter(id => id !== 'gone').map(id => product(id)),
      messages: body.params.arguments.catalog.ids.includes('gone') ? [{ type: 'info', code: 'not_found', content: 'gone' }] : [],
    }));
    const tools = createTools(task, { fetchImpl, pauseMs: 0 });
    const ids = [...Array.from({ length: 11 }, (_, i) => String(i)), 'gone'];
    const r = await tools.ucp.lookup(ids);
    expect(fetchImpl.calls).toHaveLength(2);
    expect(fetchImpl.calls[0].body.params.name).toBe('lookup_catalog');
    expect(fetchImpl.calls[0].body.params.arguments.meta['ucp-agent'].profile).toBe('https://www.muse.shopping/.well-known/ucp');
    expect(r.products).toHaveLength(11);
    expect(r.notFound).toEqual(['gone']);
  });

  test('a JSON-RPC error becomes a thrown error', async () => {
    const tools = createTools(task, { fetchImpl: fakeFetch(() => ({ jsonrpc: '2.0', id: 1, error: { code: -32603, message: 'Internal error' } })), pauseMs: 0 });
    await expect(tools.ucp.search('x')).rejects.toThrow(/Internal error/);
  });

  test('getText follows redirects that stay on the store', async () => {
    const fetchImpl = fakeFetch(() => 'page');
    const hops = { 'https://www.allbirds.com/x': 'https://allbirds.com/x', 'https://allbirds.com/x': '/y' };
    const fn = async (url, init) => {
      if (hops[url]) return { ok: false, status: 301, headers: { get: () => hops[url] }, text: async () => '' };
      return fetchImpl(url, init);
    };
    const tools = createTools(task, { fetchImpl: fn, pauseMs: 0 });
    await expect(tools.http.getText('https://www.allbirds.com/x')).resolves.toBe('page');
    expect(fetchImpl.calls[0].url).toBe('https://allbirds.com/y');
    expect(tools.requestsUsed).toBe(3);
  });

  test('getText refuses a redirect to another site, and redirect loops', async () => {
    const to = loc => async () => ({ ok: false, status: 302, headers: { get: () => loc }, text: async () => '' });
    const off = createTools(task, { fetchImpl: to('https://evil.example/'), pauseMs: 0 });
    await expect(off.http.getText('https://www.allbirds.com/x')).rejects.toThrow(/blocked: evil.example is not this store \(redirected/);
    const loop = createTools(task, { fetchImpl: to('https://www.allbirds.com/x'), pauseMs: 0 });
    await expect(loop.http.getText('https://www.allbirds.com/x')).rejects.toThrow(/more than 3 redirects/);
  });

  test('json-ld products are found in pages and @graph blocks', () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"A"}</script>
      <script type="application/ld+json">{"@graph":[{"@type":"ProductGroup","name":"B"},{"@type":"Organization"}]}</script>
      <script type="application/ld+json">{bad json</script>`;
    expect(jsonLdProducts(html).map(p => p.name)).toEqual(['A', 'B']);
  });
});

describe('shopify-catalog script', () => {
  test('turns watched lookups and new-drop searches into contract listings', async () => {
    const tools = {
      ucp: {
        lookup: async ids => ({ products: ids.map(id => product(id.split('/').pop())), notFound: [] }),
        search: async () => ({ products: [product('1'), product('2')], nextCursor: null }),
      },
      log: () => {},
    };
    const out = await shopifyCatalog.run({
      task: { ...task, watchedItemIds: ['gid://shopify/Product/1'], searchQueries: ['new arrivals women'] },
      tools,
    });
    const checked = validateOutput(out);
    expect(checked.dropped).toBe(0);
    expect(checked.listings.map(l => l.itemId)).toEqual(['gid://shopify/Product/1', 'gid://shopify/Product/2']);
    expect(checked.listings[0].variants[0]).toEqual({
      variantId: 'gid://shopify/ProductVariant/11', size: '8', color: 'Navy', priceCents: 9800, compareAtCents: 12000, available: true,
    });
    // list_price 0 means no sale price
    expect(checked.listings[0].variants[1]).toMatchObject({ size: '9', compareAtCents: null, available: false });
    expect(checked.listings[0].imageUrl).toBe('https://cdn.shopify.com/1.jpg');
  });
});

describe('runner', () => {
  const ownScript = `${SCRIPTS_DIR}/zz-test-store.js`;
  afterEach(() => { if (fs.existsSync(ownScript)) fs.unlinkSync(ownScript); });

  test('a store\'s own script replaces the default, but not an override', () => {
    const t = { storeKey: 'zz-test-store', script: 'shopify-catalog' };
    expect(resolveScript(t)).toBe('shopify-catalog');
    fs.writeFileSync(ownScript, 'module.exports = { run: async () => ({ listings: [] }) };');
    expect(resolveScript(t)).toBe('zz-test-store');
    expect(resolveScript({ ...t, script: 'embedded-product-data' })).toBe('embedded-product-data');
    expect(resolveScript({ storeKey: '../x', script: 'shopify-catalog' })).toBe('shopify-catalog');
  });

  test('the result names the script that ran, and marks a trial', async () => {
    fs.writeFileSync(ownScript, 'module.exports = { run: async () => ({ listings: [] }) };');
    const r = await runTask({ ...task, storeKey: 'zz-test-store', trial: true });
    expect(r).toMatchObject({ scriptName: 'zz-test-store', trial: true, ok: true });
  });

  test('rejects script names that could escape the scripts folder', () => {
    expect(() => scriptPath('../../src/config/database')).toThrow(/bad script name/);
    expect(scriptPath('shopify-catalog')).toBe(path.join(__dirname, '../../extractors/scripts/shopify-catalog.js'));
  });

  test('a failing script comes back as ok:false with its error and a version', async () => {
    const r = await runTask({ ...task, searchQueries: ['x'] }, {
      toolsOptions: { fetchImpl: fakeFetch(() => ({ error: { code: -32603, message: 'Internal error' } })), pauseMs: 0 },
    });
    expect(r).toMatchObject({ storeKey: 'allbirds', ok: false, scriptName: 'shopify-catalog' });
    expect(r.error).toMatch(/Internal error/);
    expect(r.scriptVersion).toMatch(/^[0-9a-f]{12}$/);
  });

  test('a working script comes back validated', async () => {
    const r = await runTask({ ...task, searchQueries: ['new arrivals women'] }, {
      toolsOptions: { fetchImpl: fakeFetch(() => rpc({ products: [product('7')] })), pauseMs: 0 },
    });
    expect(r.ok).toBe(true);
    expect(r.output.listings).toHaveLength(1);
    expect(r.requestsUsed).toBe(1);
  });
});
