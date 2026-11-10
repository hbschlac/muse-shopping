// A signed-in shopper who already has a passkey can't add another one on their own.
// Otherwise a stolen login could add its own Face ID and approve carts.

jest.mock('../../src/db/pool', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const pool = require('../../src/db/pool');
const Passkeys = require('../../src/services/passkeys');

function fakeDb({ passkeys = [] } = {}) {
  pool.query.mockImplementation(async (sql) => {
    if (/FROM shopper_passkeys/.test(sql)) {
      return { rows: passkeys.map((id) => ({ credential_id: id, transports: [], created_at: new Date() })) };
    }
    if (/FROM users/.test(sql)) return { rows: [{ email: 'shopper@example.com' }] };
    return { rows: [] };
  });
  pool.connect.mockResolvedValue({ query: pool.query, release: jest.fn() });
}

describe('passkey setup', () => {
  beforeEach(() => jest.clearAllMocks());

  test('first passkey: returns setup options and saves a challenge', async () => {
    fakeDb();
    const options = await Passkeys.registrationOptions(7);
    expect(options.challenge).toBeTruthy();
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO passkey_challenges/.test(sql))).toBe(true);
  });

  test('already has a passkey: setup options are refused', async () => {
    fakeDb({ passkeys: ['cred-1'] });
    await expect(Passkeys.registrationOptions(7)).rejects.toMatchObject({ statusCode: 409 });
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO passkey_challenges/.test(sql))).toBe(false);
  });

  test('already has a passkey: a second registration is refused before anything is saved', async () => {
    fakeDb({ passkeys: ['cred-1'] });
    await expect(Passkeys.verifyRegistration(7, {})).rejects.toMatchObject({ statusCode: 409 });
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO shopper_passkeys/.test(sql))).toBe(false);
  });
});
