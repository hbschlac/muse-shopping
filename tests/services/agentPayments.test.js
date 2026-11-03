/**
 * Agent payment rails: rail selection per store, Stripe SPT issuing, and the
 * UCP profile's signing key and payment handlers.
 */
const { selectRail, enabledRails } = require('../../src/services/agentPayments/railSelector');
const {
  issueSharedPaymentToken,
  revokeSharedPaymentToken,
  buildUcpStripeInstrument,
  MAX_TTL_SECONDS,
} = require('../../src/services/agentPayments/stripeSpt');
const { buildAgentProfile } = require('../../src/services/agentBridges/agentProfile');
const partners = require('../../src/services/agentBridges/partners.json').partners;

const SHOPIFY_HANDLERS = ['com.google.pay', 'dev.shopify.card', 'dev.shopify.shop_pay'];
const STRIPE_ON = { STRIPE_AGENT_SECRET_KEY: 'sk_test_x', STRIPE_AGENT_PROFILE_ID: 'profile_muse' };

describe('selectRail', () => {
  it('hands off when no rail is switched on (today)', () => {
    expect(selectRail(SHOPIFY_HANDLERS, {})).toMatchObject({ rail: 'handoff', handler: null });
    expect(enabledRails({})).toEqual([]);
  });

  it('hands every current partner off with production settings', () => {
    for (const p of partners) expect(selectRail(p.paymentHandlers, {}).rail).toBe('handoff');
  });

  it('prefers Shop Pay at a Shopify store once Shopify approves Muse', () => {
    expect(selectRail(SHOPIFY_HANDLERS, { MUSE_RAIL_SHOP_PAY: 'on', MUSE_RAIL_GOOGLE_PAY: 'on' }))
      .toMatchObject({ rail: 'shop_pay', handler: 'dev.shopify.shop_pay' });
  });

  it('uses a Stripe SPT only where the store publishes com.stripe.payments', () => {
    expect(selectRail(SHOPIFY_HANDLERS, STRIPE_ON).rail).toBe('handoff');
    expect(selectRail({ 'com.stripe.payments': [{}] }, STRIPE_ON))
      .toMatchObject({ rail: 'stripe_spt', handler: 'com.stripe.payments' });
  });

  it('says why it handed off', () => {
    expect(selectRail(SHOPIFY_HANDLERS, {}).reason).toMatch(/not switched on/);
    expect(selectRail([], {}).reason).toMatch(/no handler/);
  });
});

describe('chooseRail', () => {
  const { chooseRail } = require('../../src/services/agentPayments/railSelector');
  it('logs rail.selected with the reason', async () => {
    const audit = { recordAgentEvent: jest.fn(async () => null) };
    const choice = await chooseRail(SHOPIFY_HANDLERS, { partnerKey: 'allbirds' }, { env: {}, audit });
    expect(choice.rail).toBe('handoff');
    expect(audit.recordAgentEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'rail.selected', rail: 'handoff', partnerKey: 'allbirds', reason: expect.stringMatching(/not switched on/),
    }));
  });
});

describe('Stripe shared payment tokens', () => {
  const audit = { recordAgentEvent: jest.fn(async () => ({ id: 1 })) };
  function okFetch(body) {
    return jest.fn(async () => ({ ok: true, status: 200, json: async () => body }));
  }

  it('is off without a key', async () => {
    await expect(issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s', maxAmount: 1000 },
      { env: {}, fetchImpl: okFetch({}) },
    )).rejects.toMatchObject({ code: 'rail_off' });
  });

  it('grants one store a capped token that expires within 30 minutes', async () => {
    const fetchImpl = okFetch({ id: 'spt_123', status: 'active' });
    const now = Date.UTC(2026, 10, 3);
    const spt = await issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s', maxAmount: 13100, ttlSeconds: 99999 },
      { env: STRIPE_ON, fetchImpl, now, audit },
    );
    expect(spt.id).toBe('spt_123');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.stripe.com/v1/shared_payment/issued_tokens');
    const body = new URLSearchParams(init.body);
    expect(body.get('seller_details[network_business_profile]')).toBe('profile_s');
    expect(body.get('usage_limits[max_amount]')).toBe('13100');
    expect(Number(body.get('usage_limits[expires_at]'))).toBe(now / 1000 + MAX_TTL_SECONDS);
    expect(init.headers.Authorization).toBe('Bearer sk_test_x');
  });

  it('rejects a missing cap', async () => {
    await expect(issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s' },
      { env: STRIPE_ON, fetchImpl: okFetch({}), audit },
    )).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('surfaces Stripe errors', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false, status: 402, json: async () => ({ error: { message: 'declined', code: 'card_declined' } }),
    }));
    await expect(issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s', maxAmount: 100 },
      { env: STRIPE_ON, fetchImpl, audit },
    )).rejects.toMatchObject({ status: 402, code: 'card_declined' });
  });

  it('logs the issue as required, with only the last four of the token', async () => {
    audit.recordAgentEvent.mockClear();
    await issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s', maxAmount: 500, context: { partnerKey: 'allbirds', cartSessionId: 'c1' } },
      { env: STRIPE_ON, fetchImpl: okFetch({ id: 'spt_abcd1234' }), audit },
    );
    const [event, opts] = audit.recordAgentEvent.mock.calls[0];
    expect(opts).toEqual({ required: true });
    expect(event).toMatchObject({ action: 'credential.issued', rail: 'stripe_spt', partnerKey: 'allbirds', amountCents: 500 });
    expect(JSON.stringify(event)).not.toContain('spt_abcd1234');
  });

  it('revokes the token and stops if the log write fails', async () => {
    const failing = { recordAgentEvent: jest.fn(async () => { throw new Error('db down'); }) };
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'spt_9' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'spt_9', status: 'deactivated' }) });
    await expect(issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s', maxAmount: 500 },
      { env: STRIPE_ON, fetchImpl, audit: failing },
    )).rejects.toMatchObject({ code: 'audit_failed' });
    expect(fetchImpl.mock.calls[1][0]).toMatch(/spt_9\/revoke$/);
  });

  it('refuses to issue without the activity log', async () => {
    const fetchImpl = okFetch({ id: 'spt_1' });
    await expect(issueSharedPaymentToken(
      { paymentMethodId: 'pm_1', sellerProfile: 'profile_s', maxAmount: 500 },
      { env: STRIPE_ON, fetchImpl, audit: null },
    )).rejects.toMatchObject({ code: 'audit_unavailable' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('revokes by id', async () => {
    const fetchImpl = okFetch({ id: 'spt_9', status: 'deactivated' });
    await revokeSharedPaymentToken('spt_9', { env: STRIPE_ON, fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.stripe.com/v1/shared_payment/issued_tokens/spt_9/revoke');
    await expect(revokeSharedPaymentToken('pm_1', { env: STRIPE_ON, fetchImpl })).rejects.toThrow();
  });

  it('builds the UCP complete_checkout instrument', () => {
    expect(buildUcpStripeInstrument('spt_123')).toEqual({
      payment: {
        instruments: [{
          id: 'instr_1',
          handler_id: 'stripe_payments',
          type: 'card',
          selected: true,
          credential: { type: 'stripe_payment_token', token: 'spt_123' },
        }],
      },
    });
  });
});

describe('UCP profile', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('publishes the shared Ed25519 key as EdDSA, without the private part', () => {
    process.env.UCP_SIGNING_PUBLIC_JWK = JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: 'PUB', d: 'SECRET', kid: 'muse-wba-1' });
    const [key] = buildAgentProfile().keys;
    expect(key).toEqual({ use: 'sig', kid: 'muse-wba-1', kty: 'OKP', crv: 'Ed25519', x: 'PUB', alg: 'EdDSA' });
  });

  it('refuses key types UCP does not define', () => {
    process.env.UCP_SIGNING_PUBLIC_JWK = JSON.stringify({ kty: 'RSA', n: 'N', e: 'AQAB', d: 'SECRET' });
    expect(buildAgentProfile().keys).toEqual([]);
  });

  it('keeps payment_handlers empty until the Stripe rail is configured', () => {
    delete process.env.STRIPE_AGENT_PROFILE_ID;
    expect(buildAgentProfile().ucp.payment_handlers).toEqual({});
  });

  it('declares com.stripe.payments once Muse has a Stripe profile', () => {
    process.env.STRIPE_AGENT_PROFILE_ID = 'profile_muse';
    const [h] = buildAgentProfile().ucp.payment_handlers['com.stripe.payments'];
    expect(h).toMatchObject({
      id: 'stripe_payments',
      available_instruments: [{ type: 'card' }],
      config: { environment: 'testmode', business_profile: 'profile_muse' },
    });
  });
});

describe('UCP profile keys from the shared signer', () => {
  const { buildAgentProfileFromSigner } = require('../../src/services/agentBridges/agentProfile');
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('publishes every key version the signer publishes, public half only', async () => {
    process.env.UCP_SIGNING_PUBLIC_JWK = JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: 'STALE' });
    const signing = { publicKeys: async () => [
      { kty: 'OKP', crv: 'Ed25519', x: 'NEW', kid: 'thumb-new', d: 'SECRET' },
      { kty: 'OKP', crv: 'Ed25519', x: 'OLD', kid: 'thumb-old' },
    ] };
    const { keys } = await buildAgentProfileFromSigner(signing);
    expect(keys.map(k => k.kid)).toEqual(['thumb-new', 'thumb-old']);
    expect(keys.every(k => k.alg === 'EdDSA' && k.d === undefined)).toBe(true);
  });

  it('falls back to the env key when the signer is off', async () => {
    process.env.UCP_SIGNING_PUBLIC_JWK = JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: 'ENV', kid: 'env' });
    const signing = { publicKeys: async () => { throw new Error('NOT_CONFIGURED'); } };
    expect((await buildAgentProfileFromSigner(signing)).keys[0].x).toBe('ENV');
    expect((await buildAgentProfileFromSigner(null)).keys[0].x).toBe('ENV');
  });
});

describe('UCP request signing', () => {
  jest.mock('../../src/utils/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() }));
  const { requestHeaders } = require('../../src/services/agentBridges/ucpMcpClient');
  const URL = 'https://agolde.myshopify.com/api/ucp/mcp';

  it('sends UCP-Agent and stays unsigned unless switched on', async () => {
    const signing = { signUcpRequest: jest.fn() };
    const h = await requestHeaders(URL, '{}', 'idem-1', {}, signing);
    expect(h['UCP-Agent']).toMatch(/^profile="https:\/\//);
    expect(h['Idempotency-Key']).toBe('idem-1');
    expect(h.Signature).toBeUndefined();
    expect(signing.signUcpRequest).not.toHaveBeenCalled();
  });

  it('signs the exact body with the shared signer when switched on', async () => {
    const signing = { signUcpRequest: jest.fn(async () => ({ Signature: 'sig1=:x:', 'Signature-Input': 'sig1=()', 'Content-Digest': 'sha-256=:y:' })) };
    const h = await requestHeaders(URL, '{"a":1}', null, { AGENT_SIGN_UCP_REQUESTS: 'true' }, signing);
    expect(signing.signUcpRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', url: URL, body: '{"a":1}' }));
    expect(h.Signature).toBe('sig1=:x:');
    expect(h['Content-Digest']).toBe('sha-256=:y:');
  });

  it('falls back to unsigned if the signer fails', async () => {
    const signing = { signUcpRequest: jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'NOT_CONFIGURED' }); }) };
    const h = await requestHeaders(URL, '{}', null, { AGENT_SIGN_UCP_REQUESTS: 'true' }, signing);
    expect(h.Signature).toBeUndefined();
  });
});
