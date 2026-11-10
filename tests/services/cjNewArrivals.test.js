/**
 * CJ Product Feed source for new arrivals (TJ Maxx).
 */

jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));
jest.mock('../../src/services/newArrivalsService', () => ({
  recordSeenItems: jest.fn(async (slug, items) => ({ seen: items.length, added: items.length, alerted: [] })),
}));

const { recordSeenItems } = require('../../src/services/newArrivalsService');
const Cj = require('../../src/services/newArrivalSources/cj');

const RESULTS = [
  { id: 'A1', title: 'Linen Midi Dress', brand: 'Vince Camuto', gender: 'female', link: 'https://www.anrdoezrs.net/a1',
    imageLink: 'https://img/a1.jpg', price: { amount: '60.00' }, salePrice: { amount: '29.99' },
    googleProductCategory: { name: 'Apparel & Accessories > Clothing > Dresses' } },
  { id: 'A2', title: "Men's Oxford Shirt", gender: 'male', link: 'https://x/a2', price: { amount: '25' } },
  { id: 'A3', title: 'Ribbed Knit Sweater', link: 'https://x/a3', price: { amount: '19.99' },
    productType: ['Women', 'Sweaters'], linkCode: { clickUrl: 'https://www.jdoqocy.com/click-a3' } },
  { id: 'A4', title: 'No link' },
  { id: 'A5', title: 'Deleted Tee', gender: 'female', link: 'https://x/a5', isDeleted: true, price: { amount: '9' } },
  { id: 'A6', title: 'Sold Out Skirt', gender: 'female', link: 'https://x/a6', availability: 'out of stock', price: { amount: '9' } },
];

const env = { CJ_API_TOKEN: 't', CJ_COMPANY_ID: '777', CJ_ADVERTISERS: 'tjmaxx:123, bad, x:abc' };

describe('CJ product feed', () => {
  beforeEach(() => recordSeenItems.mockClear());

  it('keeps women\'s items and turns a sale price into price + compare-at', () => {
    const items = Cj.parseProducts(RESULTS);
    expect(items.map(i => i.externalId)).toEqual(['A1', 'A3']);
    expect(items[0]).toMatchObject({
      name: 'Linen Midi Dress', brandName: 'Vince Camuto', priceCents: 2999, originalPriceCents: 6000,
      productUrl: 'https://www.anrdoezrs.net/a1', department: 'women',
    });
    expect(items[1]).toMatchObject({
      priceCents: 1999, originalPriceCents: null, category: 'Women > Sweaters',
      productUrl: 'https://www.jdoqocy.com/click-a3',
    });
  });

  it('asks for a tracked link only when a property ID is set', async () => {
    const ok = { ok: true, json: async () => ({ data: { shoppingProducts: { resultList: [] } } }) };
    const without = jest.fn().mockResolvedValue(ok);
    await Cj.pollCj({ env, fetchImpl: without });
    const plain = JSON.parse(without.mock.calls[0][1].body);
    expect(plain.query).not.toMatch(/linkCode/);
    expect(plain.query).toMatch(/partnerStatus: JOINED/);
    expect(plain.variables.pid).toBeUndefined();

    const withPid = jest.fn().mockResolvedValue(ok);
    await Cj.pollCj({ env: { ...env, CJ_PROPERTY_ID: '999' }, fetchImpl: withPid });
    const tracked = JSON.parse(withPid.mock.calls[0][1].body);
    expect(tracked.query).toMatch(/linkCode\(pid: \$pid\) \{ clickUrl \}/);
    expect(tracked.variables.pid).toBe('999');
  });

  it('parses advertisers and needs every setting', () => {
    expect(Cj.parseAdvertisers(env.CJ_ADVERTISERS)).toEqual([{ storeSlug: 'tjmaxx', advertiserId: '123' }]);
    expect(Cj.isConfigured(env)).toBe(true);
    expect(Cj.isConfigured({ ...env, CJ_API_TOKEN: '' })).toBe(false);
  });

  it('skips when not configured', async () => {
    await expect(Cj.pollCj({ env: {} })).resolves.toEqual([{ skipped: 'cj not configured' }]);
  });

  it('polls each advertiser, sends the query with the token, and saves under the store slug', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ data: { shoppingProducts: { totalCount: 4, resultList: RESULTS } } }),
    });
    const results = await Cj.pollCj({ env, fetchImpl });

    expect(results).toEqual([{ storeSlug: 'tjmaxx', seen: 2, added: 2, alerted: [] }]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://ads.api.cj.com/query');
    expect(init.headers.Authorization).toBe('Bearer t');
    expect(JSON.parse(init.body).variables).toMatchObject({ companyId: '777', partnerIds: ['123'], offset: 0 });
    expect(recordSeenItems).toHaveBeenCalledWith('tjmaxx', expect.any(Array), 'cj');
  });

  it('reports a GraphQL error per store without throwing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ errors: [{ message: 'not approved' }] }) });
    await expect(Cj.pollCj({ env, fetchImpl })).resolves.toEqual([
      { storeSlug: 'tjmaxx', error: 'CJ product search error for 123: not approved' },
    ]);
  });
});
