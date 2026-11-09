/**
 * Item watches: Notify me on a sold-out size, price watch on save, and the
 * listActiveWatches / findWatchesForChange contract the listing refresh and
 * the alert dispatcher read.
 */

jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

const pool = require('../../src/db/pool');
const AgentBridges = require('../../src/services/agentBridges');
const Watches = require('../../src/services/watches');

const STORE = AgentBridges.listPartners()[0].key;

function row(extra = {}) {
  return {
    id: 1, user_id: 7, store_key: STORE, item_id: 'gid://shopify/Product/1', variant_id: 'gid://shopify/ProductVariant/11',
    size: 'M', color: 'Navy', kind: 'size', active: true, title: 'Linen Midi Dress', image_url: 'https://cdn/x.jpg',
    price_cents: 8900, currency: 'USD', created_at: '2026-11-09T22:00:00Z', updated_at: '2026-11-09T22:00:00Z',
    ...extra,
  };
}

// Route each SQL statement to a canned answer; record the rest.
function db({ active = 0, returning = [row()], select = [row()] } = {}) {
  pool.query.mockImplementation(async (sql) => {
    if (sql.includes('CREATE TABLE')) return { rows: [] };
    if (sql.includes('COUNT(*)')) return { rows: [{ n: active }] };
    if (sql.includes('INSERT INTO item_watches')) return { rows: returning };
    if (sql.includes('UPDATE item_watches')) return { rows: returning };
    return { rows: select };
  });
}
const calls = (needle) => pool.query.mock.calls.filter(([sql]) => sql.includes(needle));

beforeEach(() => {
  pool.query.mockReset();
  Watches._resetSchemaForTests();
});

describe('createWatch', () => {
  it('saves a size watch with the variant, size and color, and creates the table first', async () => {
    db();
    const watch = await Watches.createWatch(7, {
      storeKey: STORE, itemId: 'gid://shopify/Product/1', kind: 'size',
      variantId: 'gid://shopify/ProductVariant/11', size: 'M', color: 'Navy',
      title: 'Linen Midi Dress', imageUrl: 'https://cdn/x.jpg', priceCents: 8900, currency: 'USD',
    });

    expect(pool.query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS item_watches');
    const [sql, params] = calls('INSERT INTO item_watches')[0];
    expect(sql).toContain('ON CONFLICT (user_id, store_key, item_id, (COALESCE(variant_id, \'\')), kind)');
    expect(sql).toContain('active = true');
    expect(params.slice(0, 7)).toEqual([7, STORE, 'gid://shopify/Product/1', 'gid://shopify/ProductVariant/11', 'M', 'Navy', 'size']);
    expect(watch).toMatchObject({ id: 1, kind: 'size', size: 'M', color: 'Navy', storeKey: STORE });
  });

  it('never pins a variant, size or color on a price watch (one alert per item)', async () => {
    db({ returning: [row({ kind: 'price', variant_id: null, size: null, color: null })] });
    await Watches.createWatch(7, {
      storeKey: STORE, itemId: 'p1', kind: 'price', variantId: 'v1', size: 'M', color: 'Navy',
    });
    const [, params] = calls('INSERT INTO item_watches')[0];
    expect(params.slice(3, 7)).toEqual([null, null, null, 'price']);
  });

  it('allows a whole-item size watch when the item has no sizes', async () => {
    db({ returning: [row({ variant_id: null, size: null, color: null })] });
    await Watches.createWatch(7, { storeKey: STORE, itemId: 'p1', kind: 'size' });
    const [, params] = calls('INSERT INTO item_watches')[0];
    expect(params[3]).toBeNull();
  });

  it('rejects a bad kind, a missing item, an unknown store and signed-out shoppers', async () => {
    db();
    await expect(Watches.createWatch(7, { storeKey: STORE, itemId: 'p1', kind: 'restock' })).rejects.toThrow(/kind/);
    await expect(Watches.createWatch(7, { storeKey: STORE, kind: 'size' })).rejects.toThrow(/required/);
    await expect(Watches.createWatch(7, { storeKey: 'not-a-store', itemId: 'p1', kind: 'size' })).rejects.toThrow(/not-a-store/);
    await expect(Watches.createWatch(null, { storeKey: STORE, itemId: 'p1', kind: 'size' })).rejects.toThrow(/Sign in/);
    expect(calls('INSERT INTO item_watches')).toHaveLength(0);
  });

  it('drops non-https image urls and bad prices', async () => {
    db();
    await Watches.createWatch(7, {
      storeKey: STORE, itemId: 'p1', kind: 'size', imageUrl: 'javascript:alert(1)', priceCents: -5,
    });
    const [, params] = calls('INSERT INTO item_watches')[0];
    expect(params[8]).toBeNull();
    expect(params[9]).toBeNull();
  });

  it('caps active watches per shopper', async () => {
    db({ active: 500 });
    await expect(Watches.createWatch(7, { storeKey: STORE, itemId: 'p1', kind: 'size' })).rejects.toThrow(/up to 500/);
  });
});

describe('listWatches and removeWatch', () => {
  it('lists only the shopper\'s active watches, filtered by store and item', async () => {
    db();
    const watches = await Watches.listWatches(7, { storeKey: STORE, itemId: 'p1' });
    const [sql, params] = calls('FROM item_watches WHERE')[0];
    expect(sql).toContain('user_id = $1 AND active AND store_key = $2 AND item_id = $3');
    expect(params).toEqual([7, STORE, 'p1']);
    expect(watches[0].imageUrl).toBe('https://cdn/x.jpg');
  });

  it('turns a watch off only for its owner', async () => {
    db({ returning: [{ id: 1 }] });
    await expect(Watches.removeWatch(7, '1')).resolves.toEqual({ id: 1, removed: true });
    const [sql, params] = calls('UPDATE item_watches')[0];
    expect(sql).toContain('WHERE id = $1 AND user_id = $2');
    expect(params).toEqual([1, 7]);

    db({ returning: [] });
    await expect(Watches.removeWatch(8, '1')).rejects.toThrow(/not found/i);
    await expect(Watches.removeWatch(7, 'abc')).rejects.toThrow(/Invalid/);
  });
});

describe('listActiveWatches (read by the listing refresh)', () => {
  it('returns deduplicated { store_key, item_id, variant_id } for active watches', async () => {
    db({ select: [
      { store_key: STORE, item_id: 'p1', variant_id: null },
      { store_key: STORE, item_id: 'p1', variant_id: 'v1' },
    ] });
    const list = await Watches.listActiveWatches();
    expect(list).toEqual([
      { store_key: STORE, item_id: 'p1', variant_id: null },
      { store_key: STORE, item_id: 'p1', variant_id: 'v1' },
    ]);
    const [sql] = calls('SELECT DISTINCT')[0];
    expect(sql).toContain('WHERE active');
  });

  it('fails soft to [] so a database problem never stops a refresh', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('CREATE TABLE')) return { rows: [] };
      throw new Error('connection refused');
    });
    await expect(Watches.listActiveWatches()).resolves.toEqual([]);
  });
});

describe('findWatchesForChange (read by the alert dispatcher)', () => {
  it('matches size watches on back_in_stock by variant, by size when no variant, or whole-item', async () => {
    db();
    const found = await Watches.findWatchesForChange({
      store_key: STORE, item_id: 'p1', variant_id: 'v1', size: 'M', change_type: 'back_in_stock',
    });
    const [sql, params] = calls('FROM item_watches')[0];
    expect(sql).toContain("kind = 'size'");
    expect(sql).toContain('variant_id IS NULL');
    expect(params).toEqual([STORE, 'p1', 'v1', 'M']);
    expect(found[0].userId).toBe(7);
  });

  it('matches price watches on price_change and nothing on new_item', async () => {
    db();
    await Watches.findWatchesForChange({ store_key: STORE, item_id: 'p1', change_type: 'price_change' });
    expect(calls('FROM item_watches')[0][0]).toContain("kind = 'price'");

    pool.query.mockReset();
    await expect(Watches.findWatchesForChange({ store_key: STORE, item_id: 'p1', change_type: 'new_item' })).resolves.toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('watch routes', () => {
  const express = require('express');
  const request = require('supertest');

  function app(userId) {
    jest.resetModules();
    jest.doMock('../../src/db/pool', () => ({ query: jest.fn() }));
    jest.doMock('../../src/middleware/authMiddleware', () => (req, res, next) => {
      if (!userId) return res.status(401).json({ success: false });
      req.userId = userId;
      next();
    });
    const freshPool = require('../../src/db/pool');
    freshPool.query.mockImplementation(async (sql) => {
      if (sql.includes('COUNT(*)')) return { rows: [{ n: 0 }] };
      return { rows: [row()] };
    });
    const a = express();
    a.use(express.json());
    a.use('/watches', require('../../src/routes/watchRoutes'));
    a.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
    return { a, freshPool };
  }

  it('needs a signed-in shopper', async () => {
    const { a } = app(null);
    await request(a).get('/watches').expect(401);
  });

  it('creates, lists and removes watches for the signed-in shopper', async () => {
    const { a, freshPool } = app(7);
    const created = await request(a).post('/watches')
      .send({ storeKey: STORE, itemId: 'p1', kind: 'size', variantId: 'v1', size: 'M' })
      .expect(201);
    expect(created.body.data.watch.kind).toBe('size');
    const insert = freshPool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO item_watches'));
    expect(insert[1][0]).toBe(7);

    const listed = await request(a).get(`/watches?store=${STORE}&item=p1`).expect(200);
    expect(listed.body.data.count).toBe(1);

    await request(a).delete('/watches/1').expect(200);
    await request(a).post('/watches').send({ storeKey: STORE, itemId: 'p1', kind: 'nope' }).expect(400);
  });
});
