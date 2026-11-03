/**
 * New-arrivals carousels for Home and the TJ Maxx tile parser.
 */

jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

const pool = require('../../src/db/pool');
const NewArrivals = require('../../src/services/newArrivalsService');
const { parseTiles, priceToCents } = require('../../scripts/scrape-tjmaxx-new-arrivals');

const NOW = new Date('2026-11-02T12:00:00Z');
const daysAgo = d => new Date(NOW.getTime() - d * 86400000).toISOString();

function row(id, name, firstSeenDaysAgo, extra = {}) {
  return {
    id, name, brand_name: 'Brand', price_cents: 2999, original_price_cents: 5999,
    image_url: `https://img/${id}.jpg`, product_url: `https://store/p/${id}`, first_seen_at: daysAgo(firstSeenDaysAgo), ...extra,
  };
}

describe('getNewArrivals', () => {
  beforeEach(() => pool.query.mockReset());

  it('builds one carousel per store, newest first, women\'s clothing only', async () => {
    pool.query.mockImplementation(async (sql, params) => {
      if (sql.includes('store_catalog_items') && params[0] === 'tjmaxx') {
        return { rows: [
          row('1', 'Linen Midi Dress', 1),
          row('2', 'Leather Ankle Boots', 0), // shoes: excluded
          row('3', 'Ribbed Knit Sweater', 5),
          row('4', 'Wide Leg Trousers', 20), // older than 14 days: shown, not counted as new
          row('5', 'Silk Cami Top', 2),
          row('6', 'Denim Jacket', 3),
          row('7', 'Pleated Midi Skirt', 4),
        ] };
      }
      return { rows: [] };
    });

    const carousels = await NewArrivals.getNewArrivals({ now: NOW });

    expect(carousels).toHaveLength(1);
    const [tj] = carousels;
    expect(tj.store.slug).toBe('tjmaxx');
    expect(tj.title).toBe('New at TJ Maxx');
    expect(tj.items.map(i => i.name)).toEqual([
      'Linen Midi Dress', 'Silk Cami Top', 'Denim Jacket', 'Pleated Midi Skirt', 'Ribbed Knit Sweater', 'Wide Leg Trousers',
    ]);
    expect(tj.new_count).toBe(5);
    expect(tj.subtitle).toBe("5 new in women's clothing in the last 14 days");
    expect(tj.items[0]).toMatchObject({ id: 'tjmaxx:1', price: 29.99, original_price: 59.99, product_url: 'https://store/p/1' });
  });

  it('reads Nordstrom from nordstrom_products too, and survives a missing table', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM nordstrom_products')) {
        return { rows: ['Wrap Dress', 'Satin Slip Skirt', 'Cashmere Cardigan', 'Poplin Shirt', 'Straight Jeans', 'Wool Coat']
          .map((n, i) => row(`n${i}`, n, i)) };
      }
      throw new Error('relation "store_catalog_items" does not exist');
    });

    const carousels = await NewArrivals.getNewArrivals({ now: NOW, stores: ['nordstrom', 'tjmaxx'] });

    expect(carousels.map(c => c.store.slug)).toEqual(['nordstrom']);
    expect(carousels[0].items).toHaveLength(6);
  });

  it('hides a store with too few items and returns nothing for an unknown category', async () => {
    pool.query.mockResolvedValue({ rows: [row('1', 'Linen Midi Dress', 1)] });
    await expect(NewArrivals.getNewArrivals({ now: NOW })).resolves.toEqual([]);
    await expect(NewArrivals.getNewArrivals({ category: 'garden' })).resolves.toEqual([]);
  });

  it('recordSeenItems counts only first-time inserts and skips incomplete items', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ inserted: true }] })
      .mockResolvedValueOnce({ rows: [{ inserted: false }] });

    const result = await NewArrivals.recordSeenItems('tjmaxx', [
      { externalId: '1', name: 'A', productUrl: 'https://x/1' },
      { externalId: '2', name: 'B', productUrl: 'https://x/2' },
      { externalId: '3', name: 'C' },
    ]);

    expect(result).toEqual({ seen: 3, added: 1 });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT (store_slug, external_id)');
    expect(pool.query.mock.calls[0][0]).not.toMatch(/first_seen_at\s*=/);
  });
});

describe('schema setup', () => {
  it('creates the table once per process, before the first read, and retries after a failure', async () => {
    let svc;
    jest.isolateModules(() => { svc = require('../../src/services/newArrivalsService'); });
    pool.query.mockReset();
    pool.query
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue({ rows: [] });

    await svc.getNewArrivals({ stores: ['tjmaxx'] });
    await svc.getNewArrivals({ stores: ['tjmaxx'] });
    await svc.getNewArrivals({ stores: ['tjmaxx'] });

    const ddl = pool.query.mock.calls.filter(([sql]) => sql.includes('CREATE TABLE IF NOT EXISTS store_catalog_items'));
    expect(ddl).toHaveLength(2); // failed once, succeeded once, then cached
    expect(pool.query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS store_catalog_items');
  });
});

describe('TJ Maxx tile parser', () => {
  it('reads brand, name, price and compare-at price from a tile', () => {
    const items = parseTiles([
      {
        href: 'https://tjmaxx.tjx.com/store/jump/product/women-dresses/Linen-Midi-Dress/1000912345?colorId=NS1#x',
        lines: ['NEW', 'VINCE CAMUTO', 'Linen Midi Dress', '$29.99', 'Compare At $60.00'],
        imageUrl: 'https://img.tjmaxx/1.jpg',
      },
      { href: '/store/jump/product/women-tops/Silk-Cami/1000912346', lines: ['Silk Cami', '$14.99'] },
      { href: '/store/shop/women/_/N-123', lines: ['Women', '$1'] }, // not a product
      { href: '/store/jump/product/women-dresses/Linen-Midi-Dress/1000912345', lines: ['dup', 'dup', '$1'] },
    ]);

    expect(items).toHaveLength(2);
    expect(items.find(i => i.externalId === '1000912345')).toBeDefined();
    expect(items[1]).toMatchObject({ externalId: '1000912346', name: 'Silk Cami', brandName: null, priceCents: 1499 });
    const first = parseTiles([{
      href: 'https://tjmaxx.tjx.com/store/jump/product/women-dresses/Linen-Midi-Dress/1000912345?colorId=NS1#x',
      lines: ['NEW', 'VINCE CAMUTO', 'Linen Midi Dress', '$29.99', 'Compare At $60.00'],
    }])[0];
    expect(first).toMatchObject({
      brandName: 'VINCE CAMUTO', name: 'Linen Midi Dress', priceCents: 2999, originalPriceCents: 6000,
      productUrl: 'https://tjmaxx.tjx.com/store/jump/product/women-dresses/Linen-Midi-Dress/1000912345?colorId=NS1',
      department: 'women',
    });
  });

  it('parses prices with commas and ignores text without one', () => {
    expect(priceToCents('$1,299.00')).toBe(129900);
    expect(priceToCents('Compare At $60')).toBe(6000);
    expect(priceToCents('Sold out')).toBeNull();
  });
});
