/**
 * Every per-store script (extractors/scripts/<storeKey>.js) must read its own
 * saved test page and return listings that pass the contract. This is the
 * "that store's saved-page test" a repair has to pass before it can merge.
 *
 * Fixtures, by store key:
 *   extractors/fixtures/<key>.html      returned for every page on the store
 *   extractors/fixtures/<key>.ucp.json  { "search_catalog": {...}, "lookup_catalog": {...} }
 *                                       tool bodies returned for Catalog calls
 */
const fs = require('fs');
const path = require('path');
const { createTools } = require('../../extractors/tools');
const { validateOutput } = require('../../src/services/listingWatch/contract');
const { partners } = require('../../src/services/agentBridges/partners.json');
const { SHARED_SCRIPTS } = require('../../scripts/repair/pathRules');

const ROOT = path.join(__dirname, '../..');
const SCRIPTS = path.join(ROOT, 'extractors/scripts');
const FIXTURES = path.join(ROOT, 'extractors/fixtures');
const byKey = new Map(partners.map(p => [p.key, p]));

const perStore = fs.readdirSync(SCRIPTS)
  .filter(f => f.endsWith('.js'))
  .map(f => f.slice(0, -3))
  .filter(name => !SHARED_SCRIPTS.has(name));

function fixture(key, ext) {
  const f = path.join(FIXTURES, `${key}${ext}`);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
}

function fakeFetch(partner, html, ucp) {
  const endpointHost = partner.endpoint ? new URL(partner.endpoint).hostname : null;
  return async (url, init = {}) => {
    const u = new URL(url);
    if (endpointHost && u.hostname === endpointHost) {
      const call = JSON.parse(init.body || '{}');
      const body = ucp && ucp[call.params && call.params.name];
      return { ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: call.id, result: { structuredContent: body || { products: [] } } }) };
    }
    if (html == null) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => html };
  };
}

if (perStore.length === 0) {
  test('no per-store scripts yet', () => expect(perStore).toEqual([]));
}

describe.each(perStore)('per-store script %s', key => {
  test('is named after a known store', () => {
    expect(byKey.has(key)).toBe(true);
  });

  test('has a saved test page', () => {
    expect(fixture(key, '.html') != null || fixture(key, '.ucp.json') != null).toBe(true);
  });

  test('reads its saved test page into valid listings', async () => {
    const partner = byKey.get(key);
    const html = fixture(key, '.html');
    const ucpRaw = fixture(key, '.ucp.json');
    const task = {
      storeKey: key,
      domain: partner.domain,
      endpoint: partner.endpoint || null,
      watchedItemIds: [],
      watchedItems: [],
      searchQueries: ['new arrivals women'],
    };
    const tools = createTools(task, { fetchImpl: fakeFetch(partner, html, ucpRaw && JSON.parse(ucpRaw)), pauseMs: 0 });
    tools.log = () => {};
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const script = require(path.join(SCRIPTS, `${key}.js`));
    const checked = validateOutput(await script.run({ task, tools }));
    expect(checked.ok).toBe(true);
    expect(checked.listings.length).toBeGreaterThan(0);
    expect(checked.dropped).toBeLessThanOrEqual(Math.floor(checked.listings.length / 4));
  });
});
