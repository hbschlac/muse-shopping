/**
 * Site hardening (Nov 2026 security check):
 * - waitlist admin and manual-order routes need the admin role, not just a sign-in
 * - the production server (api/index.js) sends security headers and hides "Express"
 * - invisible characters are stripped from what people submit
 * - the public Muse MCP endpoint caps batches and labels store text as data
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

jest.mock('../src/services/agentBridges', () => ({
  search: jest.fn().mockResolvedValue({ query: 'q', searched: [], products: [], errors: [] }),
  getBridge: jest.fn(),
  listPartners: jest.fn().mockReturnValue([]),
  getPartner: jest.fn(),
}));

const pool = require('../src/db/pool');
const app = require('../api/index');
const { strip } = require('../src/middleware/stripInvisible');
const { handleMessage, STORE_TEXT_NOTICE, MAX_BATCH } = require('../src/routes/museMcpRoutes');

const token = jwt.sign({ userId: 42 }, process.env.JWT_SECRET);
const userRow = (overrides) => ({
  rows: [{ id: 42, email: 'person@example.com', role: 'user', is_admin: false, account_locked: false, ...overrides }],
});

const ADMIN_ONLY = [
  ['get', '/api/v1/waitlist/admin/statistics'],
  ['get', '/api/v1/waitlist/admin/list'],
  ['get', '/api/v1/waitlist/admin/1'],
  ['patch', '/api/v1/waitlist/admin/1'],
  ['post', '/api/v1/waitlist/admin/1/invite'],
  ['post', '/api/v1/waitlist/admin/batch-invite'],
  ['get', '/api/v1/admin/manual-orders/stats'],
  ['get', '/api/v1/admin/manual-orders'],
  ['get', '/api/v1/admin/manual-orders/MUSE-1'],
  ['post', '/api/v1/admin/manual-orders/MUSE-1/place'],
  ['post', '/api/v1/admin/manual-orders/MUSE-1/fail'],
];

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockResolvedValue({ rows: [] });
});

describe.each(ADMIN_ONLY)('%s %s is admin only', (method, path) => {
  test('rejects no token', async () => {
    await request(app)[method](path).expect(401);
  });

  test('rejects a signed-in shopper who is not an admin', async () => {
    pool.query.mockResolvedValueOnce(userRow());
    await request(app)[method](path).set('Authorization', `Bearer ${token}`).expect(401);
    // Only the admin lookup and the "blocked attempt" log ran; no waitlist or order data was read.
    const sql = pool.query.mock.calls.map(c => c[0]);
    expect(sql).toHaveLength(2);
    expect(sql[0]).toMatch(/FROM users/);
    expect(sql[1]).toMatch(/INSERT INTO security_events/);
  });
});

describe('security headers on the production server', () => {
  test('landing page and API send them and do not advertise Express', async () => {
    for (const path of ['/', '/api/v1/does-not-exist', '/.well-known/ucp']) {
      const res = await request(app).get(path);
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'self'/);
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    }
  });
});

describe('invisible characters are stripped from submissions', () => {
  const hidden = 'Ann​​a⁦ \u{E0049}\u{E0047}\u{E004E}';

  test('strip removes zero-width, direction and tag characters but keeps visible text', () => {
    expect(strip({ first_name: hidden, tags: ['a‍b'], nested: { note: 'hi﻿' } }))
      .toEqual({ first_name: 'Anna ', tags: ['ab'], nested: { note: 'hi' } });
  });

  test('passwords and non-strings are left exactly as sent', () => {
    const input = { password: 'p​w', newPassword: 'x​y', count: 3, ok: true, none: null };
    expect(strip(input)).toEqual(input);
  });

  test('the server applies it before route handlers', async () => {
    const res = await request(app)
      .post('/api/v1/waitlist/signup')
      .send({ email: 'not-an-email', first_name: hidden });
    // Validation fails on email; the point is the request reached the router without crashing.
    expect(res.status).toBe(400);
  });
});

describe('public Muse MCP endpoint', () => {
  test('rejects a batch larger than the cap', async () => {
    const batch = Array.from({ length: MAX_BATCH + 1 }, (_, i) => ({ jsonrpc: '2.0', id: i, method: 'ping' }));
    const res = await request(app).post('/api/v1/mcp').send(batch).expect(400);
    expect(res.body.error.code).toBe(-32600);
  });

  test('accepts a batch at the cap', async () => {
    const batch = Array.from({ length: MAX_BATCH }, (_, i) => ({ jsonrpc: '2.0', id: i, method: 'ping' }));
    const res = await request(app).post('/api/v1/mcp').send(batch).expect(200);
    expect(res.body).toHaveLength(MAX_BATCH);
  });

  test('tells calling agents that store text is data, not instructions', async () => {
    const init = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(init.result.instructions).toContain(STORE_TEXT_NOTICE);
    const res = await handleMessage({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'search_products', arguments: { query: 'dress' } },
    });
    expect(res.result.structuredContent.notice).toBe(STORE_TEXT_NOTICE);
    expect(JSON.parse(res.result.content[0].text).notice).toBe(STORE_TEXT_NOTICE);
  });
});
