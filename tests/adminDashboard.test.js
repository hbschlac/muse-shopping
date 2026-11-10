/**
 * Owner dashboard: only the owner's account can read it, and a missing
 * feature table blanks one section instead of breaking the page.
 * The DB pool is mocked; nothing touches a real database.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/pool', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

const pool = require('../src/db/pool');
const app = require('../api/index');
const AdminDashboard = require('../src/services/adminDashboard');

const token = jwt.sign({ userId: 7 }, process.env.JWT_SECRET);
const userRow = (overrides) => ({
  rows: [{ id: 7, email: 'hannah@muse.shopping', role: 'user', is_admin: true, account_locked: false, ...overrides }],
});

function missingTable() {
  const err = new Error('relation does not exist');
  err.code = '42P01';
  return err;
}

/** Answers dashboard queries with plausible rows, by matching the SQL. */
function fakeDb({ missing = [] } = {}) {
  return async (sql) => {
    const s = String(sql);
    for (const table of missing) {
      if (s.includes(table)) throw missingTable();
    }
    if (s.includes('FROM users WHERE id = $1') || s.includes('FROM users WHERE id')) return userRow();
    if (s.includes('INSERT INTO security_events')) return { rows: [] };
    if (s.includes('COUNT(*) FILTER (WHERE created_at >= now()') && s.includes('FROM users u')) {
      return { rows: [{ total: '3', new_7d: '2', new_30d: '3', active_1d: '1', active_7d: '2', active_30d: '3', google: '2', apple: '0' }] };
    }
    if (s.includes("to_char((created_at AT TIME ZONE 'America/Los_Angeles')")) return { rows: [{ day: '2026-11-09', count: '2' }] };
    if (s.includes('ORDER BY u.created_at DESC')) {
      return { rows: [{ id: 7, email: 'hannah@muse.shopping', name: 'Hannah', joined_at: '2026-01-05T00:00:00Z', last_seen_at: null, sign_in: 'Google', is_admin: true, is_active: true }] };
    }
    if (s.includes('FROM item_watches WHERE active GROUP BY user_id')) return { rows: [{ user_id: 7, n: '4' }] };
    if (s.includes('FROM waitlist_signups')) return { rows: [{ total: '10', new_7d: '1', invited: '0', converted: '0' }] };
    if (s.includes('SELECT 1')) return { rows: [{ '?column?': 1 }] };
    return { rows: [] };
  };
}

describe('GET /api/v1/admin/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OWNER_EMAILS;
    pool.query.mockImplementation(fakeDb());
  });

  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard').expect(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects a signed-in member who is not an admin', async () => {
    pool.query.mockResolvedValueOnce(userRow({ email: 'shopper@example.com', is_admin: false, role: 'user' }));
    await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`).expect(401);
  });

  test('rejects an admin who is not the owner, and logs the attempt', async () => {
    pool.query.mockResolvedValueOnce(userRow({ email: 'helper@muse.shopping', is_admin: true }));
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body.success).toBe(false);
    const logged = pool.query.mock.calls.find(([sql, params]) =>
      String(sql).includes('INSERT INTO security_events') && params[0] === 'owner_dashboard_denied');
    expect(logged).toBeTruthy();
    // No member data was read.
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('FROM users u'))).toBe(false);
  });

  test('OWNER_EMAILS replaces the default owner', async () => {
    process.env.OWNER_EMAILS = 'someone-else@muse.shopping';
    await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`).expect(403);
  });

  test('the owner gets the dashboard, uncached, and the view is logged', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.headers['cache-control']).toContain('no-store');
    const d = res.body.data;
    expect(d.members.total).toBe(3);
    expect(d.members.signInMethods).toEqual({ google: 2, apple: 0, email: 1 });
    expect(d.members.list[0]).toMatchObject({ email: 'hannah@muse.shopping', watches: 4, signIn: 'Google' });
    expect(d.waitlist.total).toBe(10);
    expect(typeof d.health.dbMs).toBe('number');
    const viewed = pool.query.mock.calls.find(([sql, params]) =>
      String(sql).includes('INSERT INTO security_events') && params[0] === 'owner_dashboard_viewed');
    expect(viewed).toBeTruthy();
  });

  test('owner email match ignores case', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM users WHERE id')) return userRow({ email: 'Hannah@Muse.Shopping' });
      return fakeDb()(sql);
    });
    await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`).expect(200);
  });
});

describe('getDashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a feature table that does not exist yet gives null for that section only', async () => {
    pool.query.mockImplementation(fakeDb({ missing: ['waitlist_signups', 'shopper_activity', 'alert_log', 'checkout_intents'] }));
    const d = await AdminDashboard.getDashboard();
    expect(d.members.total).toBe(3);
    expect(d.waitlist).toBeNull();
    expect(d.activity).toBeNull();
    expect(d.engagement.alerts7d).toBeNull();
    expect(d.shopping.checkouts30d).toBeNull();
  });

  test('only reads: every query is a SELECT', async () => {
    pool.query.mockImplementation(fakeDb());
    await AdminDashboard.getDashboard();
    for (const [sql] of pool.query.mock.calls) {
      expect(String(sql).trim()).toMatch(/^SELECT/i);
    }
  });

  test('if the users table cannot be read, the error reaches the caller', async () => {
    pool.query.mockRejectedValue(new Error('connection refused'));
    await expect(AdminDashboard.getDashboard()).rejects.toThrow('connection refused');
  });
});
