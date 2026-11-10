/**
 * Agent checkout: one review, one confirm, pay per store, log everything.
 * Pool, agent log and store bridges are faked in memory.
 */

jest.mock('../../src/db/pool', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../../src/services/agentAudit', () => ({ recordAgentEvent: jest.fn(), cite: jest.requireActual('../../src/services/agentAudit/rules').cite }));
jest.mock('../../src/services/bridgeCartService', () => ({ startCheckout: jest.fn() }));
jest.mock('../../src/services/agentBridges', () => ({ getPartner: jest.fn() }));
jest.mock('../../src/services/passkeys', () => ({
  verifyCartApproval: jest.fn(),
  hasPasskey: jest.fn(),
  cartApprovalOptions: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const pool = require('../../src/db/pool');
const { recordAgentEvent } = require('../../src/services/agentAudit');
const BridgeCartService = require('../../src/services/bridgeCartService');
const AgentBridges = require('../../src/services/agentBridges');
const AgentCheckout = require('../../src/services/agentCheckout');
const Passkeys = require('../../src/services/passkeys');

let intents;
let storeRows;
let events;

function fakeQuery(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('INSERT INTO checkout_intents ')) {
    const [id, user_id, cart_session_id, total_cents, currency, summary_hash, expires_at] = params;
    intents.set(id, { id, user_id, cart_session_id, status: 'draft', total_cents, currency, summary_hash, expires_at });
    return { rows: [] };
  }
  if (s.startsWith('INSERT INTO checkout_intent_stores')) {
    const keys = ['intent_id', 'partner_key', 'store_name', 'rail', 'rail_reason', 'checkout_id', 'continue_url',
      'item_count', 'quoted_cents', 'ceiling_cents', 'currency', 'status', 'items'];
    const row = { id: storeRows.length + 1, order_id: null, error: null };
    keys.forEach((k, i) => { row[k] = params[i]; });
    storeRows.push(row);
    return { rows: [] };
  }
  if (s.startsWith('SELECT * FROM checkout_intents')) {
    const it = intents.get(params[0]);
    return { rows: it && it.user_id === params[1] ? [{ ...it }] : [] };
  }
  if (s.startsWith('SELECT * FROM checkout_intent_stores')) {
    return { rows: storeRows.filter((r) => r.intent_id === params[0]).map((r) => ({ ...r })) };
  }
  if (s.startsWith('UPDATE checkout_intent_stores SET')) {
    const row = storeRows.find((r) => r.id === params[0]);
    const cols = s.match(/SET (.*) WHERE/)[1].split(', ').map((c) => c.split(' = ')[0]);
    cols.forEach((c, i) => { row[c] = params[i + 1]; });
    return { rows: [] };
  }
  if (s.startsWith('UPDATE checkout_intents SET')) {
    const it = intents.get(params[0]);
    const needsDraft = s.includes("AND status = 'draft'");
    if (!it || (needsDraft && it.status !== 'draft')) return { rows: [] };
    it.status = s.match(/status = '(\w+)'/)[1];
    return { rows: [{ id: it.id }] };
  }
  throw new Error(`unexpected SQL: ${s}`);
}

function bridgeResult() {
  return {
    cartSessionId: 'bcs_test',
    stores: [
      { partnerKey: 'allbirds', storeName: 'Allbirds', itemCount: 1,
        items: [{ cartItemId: 11, productId: 'p_runner', variantId: 'v_runner_9', title: 'Tree Runner', size: '9', color: 'Navy', quantity: 1, cartPriceCents: 9800, storePriceCents: 9800, sellerName: 'Allbirds' }],
        checkout: { id: 'chk_a', currency: 'USD', continueUrl: 'https://allbirds.com/c/a', totals: { total: { cents: 10000 } } } },
      { partnerKey: 'rothys', storeName: "Rothy's", itemCount: 2,
        checkout: { id: 'chk_r', currency: 'USD', continueUrl: 'https://rothys.com/c/r', totals: { total: { cents: 5000 } } } },
    ],
    errors: [],
    shipTo: { city: 'Oakland' },
  };
}

beforeEach(() => {
  intents = new Map();
  storeRows = [];
  events = [];
  jest.clearAllMocks();
  pool.query.mockImplementation(async (sql, params) => fakeQuery(sql, params));
  pool.connect.mockResolvedValue({ query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() });
  recordAgentEvent.mockImplementation(async (e) => { events.push(e); return { id: events.length }; });
  BridgeCartService.startCheckout.mockResolvedValue(bridgeResult());
  AgentBridges.getPartner.mockReturnValue({ paymentHandlers: ['dev.shopify.shop_pay'] });
  AgentCheckout.unregisterRail('test_rail');
  Passkeys.verifyCartApproval.mockResolvedValue({ credentialId: 'cred_1', userVerified: true });
  Passkeys.hasPasskey.mockResolvedValue(true);
  Passkeys.cartApprovalOptions.mockResolvedValue({ challenge: 'c' });
});

const actions = () => events.map((e) => e.action);

describe('prepare', () => {
  test('saves an intent with per-store ceilings and hands off when no rail is installed', async () => {
    const review = await AgentCheckout.prepare(7, {});
    expect(review.intentId).toMatch(/^ci_/);
    expect(review.totalCents).toBe(15000);
    expect(review.stores.map((s) => [s.partnerKey, s.rail, s.ceilingCents])).toEqual([
      ['allbirds', 'handoff', 10000], ['rothys', 'handoff', 5000],
    ]);
    expect(review.summaryHash).toHaveLength(64);
    expect(review.stores[0]).not.toHaveProperty('checkoutId');
    expect(actions()).toEqual(['rail.selected', 'rail.selected', 'intent.created']);
    expect(intents.get(review.intentId).status).toBe('draft');
  });
});

describe('confirm', () => {
  async function preparedWithRail(pay) {
    AgentCheckout.registerRail('test_rail', { pay });
    // No selector is installed yet, so point the store at the test rail directly.
    const review = await AgentCheckout.prepare(7, {});
    storeRows.forEach((r) => { r.rail = 'test_rail'; r.status = 'pending'; });
    return review;
  }

  test('pays each store once, logging approval and payment as required writes', async () => {
    const pay = jest.fn(async ({ store }) => ({ status: 'paid', orderId: `o_${store.partnerKey}`, totalCents: store.ceilingCents }));
    const review = await preparedWithRail(pay);
    const result = await AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash, cardToken: '4111111111111111' });

    expect(pay).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('done');
    expect(result.stores.map((s) => [s.status, s.orderId, s.continueUrl])).toEqual([
      ['paid', 'o_allbirds', null], ['paid', 'o_rothys', null],
    ]);
    const required = recordAgentEvent.mock.calls.filter(([, o]) => o && o.required).map(([e]) => e.action);
    expect(required).toEqual(['intent.approved', 'payment.submitted', 'payment.submitted']);
    expect(actions().filter((a) => a === 'payment.completed')).toHaveLength(2);
    // Rail approval data is never written to the intent tables.
    expect(JSON.stringify([...intents.values(), storeRows])).not.toContain('4111');
  });

  test('a second confirm (double tap) is refused and pays nothing more', async () => {
    const pay = jest.fn(async ({ store }) => ({ orderId: 'o', totalCents: store.ceilingCents }));
    const review = await preparedWithRail(pay);
    await AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash });
    await expect(AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash })).rejects.toThrow(/already/);
    expect(pay).toHaveBeenCalledTimes(2);
  });

  test('a wrong summary hash is refused before anything is paid', async () => {
    const pay = jest.fn();
    const review = await preparedWithRail(pay);
    await expect(AgentCheckout.confirm(7, review.intentId, { summaryHash: 'x'.repeat(64) })).rejects.toThrow(/changed/);
    expect(pay).not.toHaveBeenCalled();
    expect(actions()).toContain('intent.declined');
    expect(intents.get(review.intentId).status).toBe('draft');
  });

  test('an expired intent is refused', async () => {
    const pay = jest.fn();
    const review = await preparedWithRail(pay);
    intents.get(review.intentId).expires_at = new Date(Date.now() - 1000).toISOString();
    await expect(AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash })).rejects.toThrow(/expired/);
    expect(pay).not.toHaveBeenCalled();
    expect(intents.get(review.intentId).status).toBe('expired');
  });

  test('another shopper cannot see or confirm the intent', async () => {
    const review = await preparedWithRail(jest.fn());
    await expect(AgentCheckout.confirm(8, review.intentId, { summaryHash: review.summaryHash })).rejects.toThrow(/not found/);
  });

  test('if the approval cannot be logged, nothing is paid and the intent goes back to draft', async () => {
    const pay = jest.fn();
    const review = await preparedWithRail(pay);
    recordAgentEvent.mockImplementation(async (e, o) => {
      if (o && o.required) throw new Error('Agent activity log write failed: db down');
      events.push(e);
    });
    await expect(AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash })).rejects.toThrow(/log write failed/);
    expect(pay).not.toHaveBeenCalled();
    expect(intents.get(review.intentId).status).toBe('draft');
  });

  test('a store whose payment cannot be logged is not paid and hands off', async () => {
    const pay = jest.fn(async ({ store }) => ({ orderId: 'o', totalCents: store.ceilingCents }));
    const review = await preparedWithRail(pay);
    recordAgentEvent.mockImplementation(async (e, o) => {
      if (e.action === 'payment.submitted' && e.partnerKey === 'rothys') throw new Error('Agent activity log write failed');
      events.push(e);
    });
    const result = await AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash });
    expect(pay).toHaveBeenCalledTimes(1);
    const rothys = result.stores.find((s) => s.partnerKey === 'rothys');
    expect(rothys.status).toBe('handoff');
    expect(rothys.continueUrl).toBe('https://rothys.com/c/r');
  });

  test('a failed store falls back to its checkout link; the other store still pays', async () => {
    const pay = jest.fn(async ({ store }) => {
      if (store.partnerKey === 'allbirds') throw new Error('card declined');
      return { orderId: 'o_r', totalCents: store.ceilingCents };
    });
    const review = await preparedWithRail(pay);
    const result = await AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash });
    const byKey = Object.fromEntries(result.stores.map((s) => [s.partnerKey, s]));
    expect(byKey.allbirds).toMatchObject({ status: 'failed', continueUrl: 'https://allbirds.com/c/a', error: 'card declined' });
    expect(byKey.rothys.status).toBe('paid');
    expect(actions()).toEqual(expect.arrayContaining(['payment.failed', 'payment.completed', 'handoff.offered']));
  });

  test('a store total above the approved ceiling is blocked and logged', async () => {
    const pay = jest.fn(async ({ store }) => ({ orderId: 'o', totalCents: store.ceilingCents + 1 }));
    const review = await preparedWithRail(pay);
    const result = await AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash });
    expect(result.stores.every((s) => s.status === 'blocked')).toBe(true);
    expect(actions().filter((a) => a === 'payment.blocked')).toHaveLength(2);
    const blocked = recordAgentEvent.mock.calls.map(([e]) => e).find((e) => e.action === 'payment.blocked');
    expect(blocked.rules[0]).toMatchObject({ rule: 'payment.ceiling@v1', result: 'fail' });
    expect(blocked.rules[0].values.chargedCents).toBe(blocked.rules[0].values.approvedCents + 1);
  });
});

describe('cancel', () => {
  test('cancels a draft and logs it; a cancelled intent cannot be confirmed', async () => {
    const review = await AgentCheckout.prepare(7, {});
    const res = await AgentCheckout.cancel(7, review.intentId);
    expect(res.status).toBe('cancelled');
    expect(actions()).toContain('intent.cancelled');
    await expect(AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash })).rejects.toThrow(/already cancelled/);
  });
});

describe('passkey approval', () => {
  async function prepared(pay) {
    AgentCheckout.registerRail('test_rail', { pay });
    const review = await AgentCheckout.prepare(7, {});
    storeRows.forEach((r) => { r.rail = 'test_rail'; r.status = 'pending'; });
    return review;
  }

  test('confirm checks the passkey against this intent and review, and logs it as the approval method', async () => {
    const pay = jest.fn(async ({ store }) => ({ orderId: 'o', totalCents: store.ceilingCents }));
    const review = await prepared(pay);
    const assertion = { id: 'cred_1', response: { signature: 'sig' } };
    await AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash, passkey: assertion });
    expect(Passkeys.verifyCartApproval).toHaveBeenCalledWith(7, review.intentId, review.summaryHash, assertion);
    const approved = events.find((e) => e.action === 'intent.approved');
    expect(approved.details).toMatchObject({ method: 'passkey', credentialId: 'cred_1', userVerified: true });
    expect(JSON.stringify(approved)).not.toContain('sig');
    // Every decision cites the rules it checked, by id and version.
    expect(approved.rules.map((r) => `${r.rule}:${r.result}`)).toEqual([
      'checkout.not_expired@v1:pass', 'checkout.review_matches@v1:pass',
      'checkout.shopper_approval@v1:pass', 'checkout.one_confirm@v1:pass',
    ]);
    const submitted = events.filter((e) => e.action === 'payment.submitted');
    expect(submitted.length).toBeGreaterThan(0);
    submitted.forEach((e) => expect(e.rules.map((r) => r.rule)).toEqual(expect.arrayContaining(['payment.logged_first@v1', 'payment.no_card_storage@v1'])));
  });

  test('a failed passkey check pays nothing and leaves the intent in draft', async () => {
    const pay = jest.fn();
    const review = await prepared(pay);
    Passkeys.verifyCartApproval.mockRejectedValue(new Error('Passkey check failed.'));
    await expect(AgentCheckout.confirm(7, review.intentId, { summaryHash: review.summaryHash })).rejects.toThrow(/Passkey/);
    expect(pay).not.toHaveBeenCalled();
    expect(intents.get(review.intentId).status).toBe('draft');
    expect(events.find((e) => e.action === 'intent.declined').reason).toMatch(/Passkey/);
  });

  test('approval options tell the shopper to set up a passkey when they have none', async () => {
    const review = await AgentCheckout.prepare(7, {});
    Passkeys.hasPasskey.mockResolvedValue(false);
    await expect(AgentCheckout.approvalOptions(7, review.intentId)).resolves.toEqual({ needsPasskey: true });
    Passkeys.hasPasskey.mockResolvedValue(true);
    await expect(AgentCheckout.approvalOptions(7, review.intentId)).resolves.toEqual({ needsPasskey: false, options: { challenge: 'c' } });
    expect(Passkeys.cartApprovalOptions).toHaveBeenCalledWith(7, review.intentId, review.summaryHash);
  });
});

describe('items in the log', () => {
  test('the review, the approval and each payment record the exact items, and changing an item changes what was approved', async () => {
    const review = await AgentCheckout.prepare(7, {});
    const allbirds = review.stores.find((s) => s.partnerKey === 'allbirds');
    expect(allbirds.items[0]).toMatchObject({ productId: 'p_runner', variantId: 'v_runner_9', size: '9', color: 'Navy' });
    const created = events.find((e) => e.action === 'intent.created');
    expect(created.details.stores.find((s) => s.partnerKey === 'allbirds').items[0].variantId).toBe('v_runner_9');

    // Same totals, different size: the review hash changes, so an old approval can't cover it.
    const bridge = bridgeResult();
    bridge.stores[0].items[0].variantId = 'v_runner_10';
    BridgeCartService.startCheckout.mockResolvedValueOnce(bridge);
    const other = await AgentCheckout.prepare(7, {});
    const strip = (r) => AgentCheckout._internal.summaryHashOf({ ...r, intentId: 'same' });
    expect(strip({ ...other, stores: other.stores })).not.toBe(strip({ ...review, stores: review.stores }));
  });
});
