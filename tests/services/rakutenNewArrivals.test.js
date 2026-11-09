/**
 * Rakuten Product Search source for new arrivals, and the poll endpoint auth.
 */

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));
jest.mock('../../src/services/newArrivalsService', () => ({
  recordSeenItems: jest.fn(async (slug, items) => ({ seen: items.length, added: items.length, alerted: [] })),
}));

const { recordSeenItems } = require('../../src/services/newArrivalsService');
const Rakuten = require('../../src/services/newArrivalSources/rakuten');

const XML = `<?xml version="1.0"?><result><TotalMatches>3</TotalMatches>
<item><mid>1237</mid><merchantname>Nordstrom</merchantname><linkid>111</linkid><sku>SKU-1</sku>
  <productname><![CDATA[Women's Linen Midi Dress]]></productname>
  <category><primary>Women</primary><secondary>Dresses</secondary></category>
  <price currency="USD">129.00</price><saleprice currency="USD">89.00</saleprice>
  <linkurl>https://click.linksynergy.com/link?id=x&amp;offerid=1</linkurl><imageurl>https://n.nordstrommedia.com/1.jpg</imageurl></item>
<item><mid>1237</mid><linkid>222</linkid><sku>SKU-2</sku><productname>Men's Oxford Shirt</productname>
  <category><primary>Men</primary><secondary>Shirts</secondary></category><price>79.00</price>
  <linkurl>https://click/2</linkurl></item>
<item><mid>1237</mid><linkid>333</linkid><productname>Ribbed Tank</productname>
  <category><primary>Women</primary></category><price>25.00</price><linkurl>https://click/3</linkurl></item>
</result>`;

describe('Rakuten product search', () => {
  const env = {
    RAKUTEN_CLIENT_ID: 'id', RAKUTEN_CLIENT_SECRET: 'secret', RAKUTEN_SID: '42',
    RAKUTEN_ADVERTISERS: 'nordstrom:1237, bad, nordstrom-rack:abc',
  };
  beforeEach(() => { Rakuten.clearTokenCache(); recordSeenItems.mockClear(); });

  it('parses items, keeps women, and turns a sale price into price + compare-at', () => {
    const items = Rakuten.parseProductSearch(XML);
    expect(items.map(i => i.externalId)).toEqual(['SKU-1', '333']);
    expect(items[0]).toMatchObject({
      name: "Women's Linen Midi Dress", priceCents: 8900, originalPriceCents: 12900,
      productUrl: 'https://click.linksynergy.com/link?id=x&offerid=1', category: 'Women > Dresses', department: 'women',
    });
    expect(items[1]).toMatchObject({ priceCents: 2500, originalPriceCents: null });
  });

  it('reads the advertiser list and ignores malformed entries', () => {
    expect(Rakuten.parseAdvertisers(env.RAKUTEN_ADVERTISERS)).toEqual([{ storeSlug: 'nordstrom', mid: '1237' }]);
    expect(Rakuten.isConfigured(env)).toBe(true);
    expect(Rakuten.isConfigured({})).toBe(false);
  });

  it('gets a token once, searches each advertiser, and saves the items', async () => {
    const fetchImpl = jest.fn(async (url) => url.endsWith('/token')
      ? { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) }
      : { ok: true, status: 200, text: async () => XML });

    const results = await Rakuten.pollRakuten({ pages: 2, fetchImpl, env });

    const tokenCall = fetchImpl.mock.calls[0];
    expect(tokenCall[1].headers.Authorization).toBe(`Bearer ${Buffer.from('id:secret').toString('base64')}`);
    expect(tokenCall[1].body).toContain('scope=42');
    const search = fetchImpl.mock.calls[1];
    expect(search[0]).toContain('/productsearch/1.0?mid=1237');
    expect(search[1].headers.Authorization).toBe('Bearer tok');
    expect(fetchImpl).toHaveBeenCalledTimes(2); // small page -> no second page, token cached
    expect(recordSeenItems).toHaveBeenCalledWith('nordstrom', expect.any(Array), 'rakuten');
    expect(results).toEqual([{ storeSlug: 'nordstrom', seen: 2, added: 2, alerted: [] }]);
  });

  it('reports a failing advertiser without throwing, and skips when not configured', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 403 }));
    await expect(Rakuten.pollRakuten({ fetchImpl, env })).resolves.toEqual([
      { storeSlug: 'nordstrom', error: 'Rakuten token request failed: 403' },
    ]);
    await expect(Rakuten.pollRakuten({ env: {} })).resolves.toEqual([{ skipped: 'rakuten not configured' }]);
  });
});

describe('poll endpoint auth', () => {
  const NewsfeedController = require('../../src/controllers/newsfeedController');
  const res = () => { const r = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); return r; };

  it('rejects a missing or wrong secret', async () => {
    process.env.NEW_ARRIVALS_POLL_SECRET = 'right-secret';
    const r1 = res();
    await NewsfeedController.pollNewArrivals({ headers: {} }, r1, jest.fn());
    expect(r1.status).toHaveBeenCalledWith(401);
    const r2 = res();
    await NewsfeedController.pollNewArrivals({ headers: { authorization: 'Bearer wrong' } }, r2, jest.fn());
    expect(r2.status).toHaveBeenCalledWith(401);
  });

  it('runs the poll with the right secret', async () => {
    process.env.NEW_ARRIVALS_POLL_SECRET = 'right-secret';
    const r = res();
    await NewsfeedController.pollNewArrivals({ headers: { authorization: 'Bearer right-secret' } }, r, jest.fn());
    expect(r.status).not.toHaveBeenCalled();
    expect(r.json).toHaveBeenCalledWith({ success: true, data: { rakuten: expect.any(Array), cj: expect.any(Array) } });
  });
});
