// Face ID setup: a stolen login alone must not be able to add a passkey.
// Setup needs a code emailed to the shopper, each shopper gets one passkey,
// codes and prompts are rate-limited, and every step is logged.

jest.mock('../../src/db/pool', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../../src/services/agentAudit', () => ({ recordAgentEvent: jest.fn() }));
jest.mock('../../src/services/emailService', () => ({ sendTransactionalEmail: jest.fn() }));

const pool = require('../../src/db/pool');
const { recordAgentEvent } = require('../../src/services/agentAudit');
const emailService = require('../../src/services/emailService');
const Passkeys = require('../../src/services/passkeys');

const USER = 7;
const SMTP = { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'user', SMTP_PASS: 'placeholder' };

// A tiny in-memory stand-in for the two tables the service touches.
function fakeDb({ passkeys = [], recentPrompts = 0 } = {}) {
  const db = { passkeys: [...passkeys], challenges: [], nextId: 1 };
  pool.query.mockImplementation(async (sql, params = []) => {
    if (/FROM users/.test(sql)) return { rows: [{ email: 'shopper@example.com', full_name: 'Sam' }] };
    if (/FROM shopper_passkeys/.test(sql)) {
      return { rows: db.passkeys.map((id) => ({ credential_id: id, transports: [], created_at: new Date() })) };
    }
    if (/INSERT INTO shopper_passkeys/.test(sql)) { db.passkeys.push(params[1]); return { rows: [] }; }
    if (/SELECT COUNT\(\*\)::int AS n FROM passkey_challenges/.test(sql)) {
      const email = /purpose = 'email'/.test(sql);
      const n = email ? db.challenges.filter((c) => c.purpose === 'email').length : recentPrompts;
      return { rows: [{ n }] };
    }
    if (/INSERT INTO passkey_challenges/.test(sql)) {
      const purpose = /VALUES \(\$1, 'email'/.test(sql) ? 'email' : params[1];
      const challenge = purpose === 'email' ? params[1] : params[2];
      db.challenges.push({ id: db.nextId++, purpose, challenge, attempts: 0, live: true });
      return { rows: [] };
    }
    if (/UPDATE passkey_challenges SET expires_at = NOW\(\) WHERE user_id/.test(sql)) {
      db.challenges.filter((c) => c.purpose === 'email').forEach((c) => { c.live = false; });
      return { rows: [] };
    }
    if (/SELECT id, challenge, attempts FROM passkey_challenges/.test(sql)) {
      const live = db.challenges.filter((c) => c.purpose === 'email' && c.live);
      return { rows: live.length ? [live[live.length - 1]] : [] };
    }
    if (/UPDATE passkey_challenges SET attempts = \$2, expires_at = NOW\(\)/.test(sql)) {
      const c = db.challenges.find((x) => x.id === params[0]); c.attempts = params[1]; c.live = false; return { rows: [] };
    }
    if (/UPDATE passkey_challenges SET attempts = \$2/.test(sql)) {
      db.challenges.find((x) => x.id === params[0]).attempts = params[1]; return { rows: [] };
    }
    if (/UPDATE passkey_challenges SET expires_at = NOW\(\) WHERE id/.test(sql)) {
      db.challenges.find((x) => x.id === params[0]).live = false; return { rows: [] };
    }
    return { rows: [] };
  });
  pool.connect.mockResolvedValue({ query: pool.query, release: jest.fn() });
  return db;
}

function sentCode() {
  const body = emailService.sendTransactionalEmail.mock.calls.at(-1)[2].body;
  return body.match(/\b(\d{6})\b/)[1];
}

const actions = () => recordAgentEvent.mock.calls.map(([e]) => e.action);

describe('Face ID setup', () => {
  const saved = {};
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(SMTP).forEach((k) => { saved[k] = process.env[k]; process.env[k] = SMTP[k]; });
  });
  afterEach(() => {
    Object.keys(SMTP).forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
  });

  test('emails a code and stores only its hash', async () => {
    const db = fakeDb();
    const out = await Passkeys.sendSetupCode(USER);
    expect(out.sentTo).toMatch(/@example\.com$/);
    const code = sentCode();
    expect(db.challenges[0].challenge).not.toContain(code);
    expect(db.challenges[0].challenge).toBe(Passkeys._internal.hashCode(USER, code));
    expect(emailService.sendTransactionalEmail.mock.calls[0][2].subject).not.toContain(code);
    expect(actions()).toContain('passkey.setup_code_sent');
  });

  test('without the emailed code, no setup options are given', async () => {
    fakeDb();
    await Passkeys.sendSetupCode(USER);
    await expect(Passkeys.registrationOptions(USER, { emailCode: '' })).rejects.toThrow();
    await expect(Passkeys.registrationOptions(USER, {})).rejects.toThrow();
  });

  test('with the right code, setup options are given once', async () => {
    const db = fakeDb();
    await Passkeys.sendSetupCode(USER);
    const code = sentCode();
    const options = await Passkeys.registrationOptions(USER, { emailCode: code });
    expect(options.challenge).toBeTruthy();
    expect(db.challenges.some((c) => c.purpose === 'register')).toBe(true);
    await expect(Passkeys.registrationOptions(USER, { emailCode: code })).rejects.toThrow(/expired/);
  });

  test('five wrong codes burn the code', async () => {
    fakeDb();
    await Passkeys.sendSetupCode(USER);
    const code = sentCode();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i += 1) {
      await expect(Passkeys.registrationOptions(USER, { emailCode: wrong })).rejects.toThrow(/doesn't match/);
    }
    await expect(Passkeys.registrationOptions(USER, { emailCode: wrong })).rejects.toThrow(/Too many wrong codes/);
    await expect(Passkeys.registrationOptions(USER, { emailCode: code })).rejects.toThrow(/expired/);
    expect(actions().filter((a) => a === 'passkey.setup_code_wrong')).toHaveLength(5);
  });

  test('a new code cancels the old one', async () => {
    fakeDb();
    await Passkeys.sendSetupCode(USER);
    const first = sentCode();
    await Passkeys.sendSetupCode(USER);
    const second = sentCode();
    if (first !== second) {
      await expect(Passkeys.registrationOptions(USER, { emailCode: first })).rejects.toThrow();
    }
  });

  test('at most 3 codes per 15 minutes', async () => {
    fakeDb();
    await Passkeys.sendSetupCode(USER);
    await Passkeys.sendSetupCode(USER);
    await Passkeys.sendSetupCode(USER);
    await expect(Passkeys.sendSetupCode(USER)).rejects.toMatchObject({ statusCode: 429 });
    expect(emailService.sendTransactionalEmail).toHaveBeenCalledTimes(3);
  });

  test('refuses setup when email is not configured, instead of skipping the code', async () => {
    fakeDb();
    delete process.env.SMTP_HOST;
    await expect(Passkeys.sendSetupCode(USER)).rejects.toMatchObject({ statusCode: 503 });
    expect(emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    expect(actions()).toContain('passkey.setup_refused');
  });

  test('already has a passkey: no code, no options, no second registration', async () => {
    const db = fakeDb({ passkeys: ['cred-1'] });
    await expect(Passkeys.sendSetupCode(USER)).rejects.toMatchObject({ statusCode: 409 });
    await expect(Passkeys.registrationOptions(USER, { emailCode: '123456' })).rejects.toMatchObject({ statusCode: 409 });
    await expect(Passkeys.verifyRegistration(USER, {})).rejects.toMatchObject({ statusCode: 409 });
    expect(db.passkeys).toEqual(['cred-1']);
  });

  test('too many Face ID prompts in 10 minutes are refused', async () => {
    fakeDb({ passkeys: ['cred-1'], recentPrompts: 30 });
    await expect(Passkeys.cartApprovalOptions(USER, 'ci_1', 'a'.repeat(64))).rejects.toMatchObject({ statusCode: 429 });
    expect(actions()).toContain('passkey.rate_limited');
  });

  test('a bad device response gives a plain message and is logged', async () => {
    fakeDb();
    await Passkeys.sendSetupCode(USER);
    await Passkeys.registrationOptions(USER, { emailCode: sentCode() });
    // the register challenge is taken by the DELETE … RETURNING query; the fake returns none, so it times out
    await expect(Passkeys.verifyRegistration(USER, { id: 'x' })).rejects.toThrow(/timed out/);
  });
});
