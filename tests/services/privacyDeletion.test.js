/**
 * Privacy deletion runs on its own, with no manual step:
 * - Meta's data deletion callback finds the shopper and deletes Instagram data.
 * - Removing Gmail deletes the stored connection (scan results cascade).
 * - Deleting an account removes the user row and the tables with no foreign key.
 */

const crypto = require('crypto');

const client = { query: jest.fn(), release: jest.fn() };
jest.mock('../../src/db/pool', () => ({ query: jest.fn(), connect: jest.fn() }));

const pool = require('../../src/db/pool');
const Privacy = require('../../src/services/privacyDeletion');

let existingTables;
let socialLeft;
const sqlLog = [];

function route(sql, params) {
  sqlLog.push([sql.replace(/\s+/g, ' ').trim(), params]);
  if (sql.includes('to_regclass')) {
    const t = params[0].replace('public.', '');
    return { rows: [{ t: existingTables.has(t) ? t : null }] };
  }
  if (sql.startsWith('DELETE FROM')) return { rowCount: 1, rows: [] };
  if (sql.includes('SELECT 1 FROM social_connections')) return { rows: socialLeft ? [{ '?column?': 1 }] : [] };
  if (sql.includes('SELECT user_id FROM social_connections')) return { rows: [{ user_id: 42 }] };
  return { rows: [], rowCount: 0 };
}

beforeEach(() => {
  sqlLog.length = 0;
  socialLeft = false;
  existingTables = new Set([
    'social_connections', 'user_instagram_follows', 'instagram_style_insights', 'instagram_sync_jobs',
    'email_connections', 'push_subscriptions', 'notification_prefs', 'alert_log', 'users', 'audit_logs',
  ]);
  client.query.mockReset().mockImplementation(async (sql, params) => route(sql, params));
  client.release.mockReset();
  pool.query.mockReset().mockImplementation(async (sql, params) => route(sql, params));
  pool.connect.mockReset().mockResolvedValue(client);
});

const deletes = () => sqlLog.filter(([s]) => s.startsWith('DELETE FROM')).map(([s]) => s.split(' ')[2]);

test('finds the shopper by Meta id using the real column names', async () => {
  await expect(Privacy.findUserIdByMetaId('123')).resolves.toBe(42);
  const [sql, params] = sqlLog.find(([s]) => s.includes('SELECT user_id'));
  expect(sql).toContain('provider = ANY($1) AND provider_user_id = $2');
  expect(params).toEqual([['instagram', 'facebook'], '123']);
});

test('Instagram deletion removes the connection and all style data', async () => {
  await Privacy.deleteInstagramData(42);
  expect(deletes()).toEqual([
    'social_connections', 'user_instagram_follows', 'instagram_style_insights', 'instagram_sync_jobs',
  ]);
  expect(client.query).toHaveBeenCalledWith('COMMIT');
});

test('removing only Facebook keeps style data while Instagram is still connected', async () => {
  socialLeft = true;
  await Privacy.deleteInstagramData(42, ['facebook']);
  expect(deletes()).toEqual(['social_connections']);
});

test('skips tables that do not exist instead of failing', async () => {
  existingTables.delete('instagram_sync_jobs');
  await Privacy.deleteInstagramData(42);
  expect(deletes()).not.toContain('instagram_sync_jobs');
});

test('Gmail removal deletes the stored connection', async () => {
  const out = await Privacy.deleteGmailData(42);
  expect(deletes()).toEqual(['email_connections']);
  expect(out.email_connections).toBe(1);
});

test('account deletion clears unlinked tables, then the user, and logs it without personal details', async () => {
  await Privacy.deleteAccount(42, 'user_request');
  expect(deletes()).toEqual(['push_subscriptions', 'notification_prefs', 'alert_log', 'users']);
  const audit = sqlLog.find(([s]) => s.startsWith('INSERT INTO audit_logs'));
  expect(audit).toBeTruthy();
  expect(audit[0]).toContain('VALUES (NULL,');
  expect(deletes()).not.toContain('agent_events');
});

test('a failed delete rolls back', async () => {
  client.query.mockImplementation(async (sql, params) => {
    if (sql.startsWith('DELETE FROM users')) throw new Error('boom');
    return route(sql, params);
  });
  await expect(Privacy.deleteAccount(42)).rejects.toThrow('boom');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalled();
});

describe('Meta signed request', () => {
  const { parseSignedRequest } = require('../../src/routes/dataDeletionRoutes');
  const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  function sign(payloadObj, secret) {
    const payload = b64url(JSON.stringify(payloadObj));
    const sig = b64url(crypto.createHmac('sha256', secret).update(payload).digest());
    return `${sig}.${payload}`;
  }

  test('accepts a correctly signed request', () => {
    const req = sign({ algorithm: 'HMAC-SHA256', user_id: '123' }, 'test-secret');
    expect(parseSignedRequest(req, 'test-secret')).toMatchObject({ user_id: '123' });
  });

  test('rejects a wrong signature or garbage without throwing', () => {
    const req = sign({ algorithm: 'HMAC-SHA256', user_id: '123' }, 'other-secret');
    expect(parseSignedRequest(req, 'test-secret')).toBeNull();
    expect(parseSignedRequest('abc.%%%', 'test-secret')).toBeNull();
    expect(parseSignedRequest('short.' + b64url('{}'), 'test-secret')).toBeNull();
  });
});
