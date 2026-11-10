/**
 * Agent activity log: append-only, hash-chained, no card data.
 */

jest.mock('../../src/db/pool', () => ({ query: jest.fn(), connect: jest.fn() }));

const pool = require('../../src/db/pool');
const AgentAudit = require('../../src/services/agentAudit');

// In-memory stand-in for the agent_events table.
let table;

function fakeClient() {
  return {
    query: jest.fn(async (sql, params) => {
      if (/^SELECT hash FROM agent_events ORDER BY id DESC/.test(sql)) {
        return { rows: table.length ? [{ hash: table[table.length - 1].hash }] : [] };
      }
      if (/^INSERT INTO agent_events/.test(sql)) {
        const [occurred_at, user_id, cart_session_id, checkout_intent_id, actor, action, decision, reason,
          partner_key, rail, amount_cents, currency, details, request_id, prev_hash, hash] = params;
        const row = {
          id: String(table.length + 1), occurred_at: new Date(occurred_at), user_id, cart_session_id,
          checkout_intent_id, actor, action, decision, reason, partner_key, rail, amount_cents, currency,
          details: JSON.parse(details), request_id, prev_hash, hash,
        };
        table.push(row);
        return { rows: [{ id: row.id }] };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
}

beforeEach(() => {
  table = [];
  pool.connect.mockReset().mockImplementation(async () => fakeClient());
  pool.query.mockReset().mockImplementation(async (sql, params) => {
    if (/WHERE id > \$1/.test(sql)) return { rows: table.filter((r) => Number(r.id) > params[0]) };
    if (/WHERE cart_session_id = \$1/.test(sql)) return { rows: table.filter((r) => r.cart_session_id === params[0]) };
    if (/WHERE id = \$1/.test(sql)) return { rows: table.filter((r) => Number(r.id) === params[0]) };
    if (/SELECT cart_session_id FROM agent_events WHERE checkout_intent_id/.test(sql)) {
      const r = table.find((x) => x.checkout_intent_id === params[0] && x.cart_session_id);
      return { rows: r ? [{ cart_session_id: r.cart_session_id }] : [] };
    }
    if (/WHERE \(\$1::text IS NOT NULL AND cart_session_id/.test(sql)) {
      return { rows: table.filter((r) => (params[0] && r.cart_session_id === params[0]) || (params[1] && r.checkout_intent_id === params[1])) };
    }
    if (/WHERE id < \$1 ORDER BY id DESC LIMIT 1/.test(sql)) {
      const prev = table.filter((r) => Number(r.id) < Number(params[0])).at(-1);
      return { rows: prev ? [{ hash: prev.hash }] : [] };
    }
    return { rows: [] };
  });
});

describe('ensureSchema', () => {
  test('creates the table on first use, once per process, and retries after a failure', async () => {
    let Fresh;
    jest.isolateModules(() => { Fresh = require('../../src/services/agentAudit'); });
    const ddlCalls = [];
    let failNext = true;
    pool.connect.mockImplementation(async () => {
      const client = fakeClient();
      const base = client.query;
      client.query = jest.fn(async (sql, params) => {
        if (sql.includes('CREATE TABLE IF NOT EXISTS agent_events')) {
          ddlCalls.push(sql);
          if (failNext) { failNext = false; throw new Error('db asleep'); }
          return { rows: [] };
        }
        return base(sql, params);
      });
      return client;
    });

    await expect(Fresh.recordAgentEvent({ actor: 'muse-agent', action: 'a' }, { required: true }))
      .rejects.toThrow(/db asleep/);
    await Fresh.recordAgentEvent({ actor: 'muse-agent', action: 'b' });
    await Fresh.recordAgentEvent({ actor: 'muse-agent', action: 'c' });

    expect(ddlCalls).toHaveLength(2); // failed once, then succeeded once
    expect(table.map((r) => r.action)).toEqual(['b', 'c']);
  });
});

describe('redact', () => {
  test('removes card data, tokens, cryptograms and secrets at any depth', () => {
    const out = AgentAudit.redact({
      last4: '4242',
      credential: { type: 'shop_token', token: 'shop_abc123' },
      paymentInformation: { tokenizedCard: { number: '4111111111111111', cryptogram: 'AgAAAAAAAIR8CQrXcIhbQAAAAAA=', expirationMonth: '12' } },
      accessToken: 'eyJhbGci',
      headers: { Authorization: 'Bearer x', 'Signature-Input': 'sig1=...' },
      note: 'shopper typed 4111 1111 1111 1111 into the chat',
      orderNumber: '#1001',
      items: [{ cvv: '123', title: 'Wool Runner' }],
    });
    expect(out.last4).toBe('4242');
    expect(out.credential).toEqual({ type: 'shop_token', token: '[redacted]' });
    expect(out.paymentInformation.tokenizedCard.number).toBe('[redacted]');
    expect(out.paymentInformation.tokenizedCard.cryptogram).toBe('[redacted]');
    expect(out.paymentInformation.tokenizedCard.expirationMonth).toBe('12');
    expect(out.accessToken).toBe('[redacted]');
    expect(out.headers.Authorization).toBe('[redacted]');
    expect(out.headers['Signature-Input']).toBe('[redacted]');
    expect(out.note).toBe('shopper typed [card ...1111] into the chat');
    expect(out.orderNumber).toBe('#1001');
    expect(out.items[0]).toEqual({ cvv: '[redacted]', title: 'Wool Runner' });
  });

  test('leaves long numbers that are not card numbers alone', () => {
    expect(AgentAudit.redact('order 1234567890123')).toBe('order 1234567890123');
  });
});

describe('recordAgentEvent', () => {
  test('writes a redacted, hash-chained row and links it to the previous one', async () => {
    const first = await AgentAudit.recordAgentEvent({
      actor: 'muse-agent', action: 'checkout.created', userId: 7, cartSessionId: 'cs_1',
      partnerKey: 'allbirds', amountCents: 11000, currency: 'USD',
      details: { checkoutId: 'chk_1', credential: { token: 'secret' } },
    });
    const second = await AgentAudit.recordAgentEvent({
      actor: 'shopper', action: 'checkout.approved', decision: 'approved', userId: 7, cartSessionId: 'cs_1',
    });

    expect(first.id).toBe('1');
    expect(table[0].details).toMatchObject({ checkoutId: 'chk_1', credential: { token: '[redacted]' } });
    expect(table[0].details.agent).toEqual({ code: expect.any(String), rulebook: expect.any(String) });
    expect(table[0].prev_hash).toBeNull();
    expect(table[1].prev_hash).toBe(first.hash);
    expect(second.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await AgentAudit.verifyChain()).toEqual({ ok: true, checked: 2 });
  });

  test('verifyChain finds a row that was changed after it was written', async () => {
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'rail.selected', rail: 'shop_pay' });
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'payment.completed', amountCents: 5000 });
    table[1].amount_cents = 50; // someone edits the amount directly in the database

    expect(await AgentAudit.verifyChain()).toEqual({ ok: false, checked: 1, brokenAt: 2 });
  });

  test('rejects events without actor/action or with an unknown decision', async () => {
    await expect(AgentAudit.recordAgentEvent({ action: 'x' })).rejects.toThrow(/actor and action/);
    await expect(AgentAudit.recordAgentEvent({ actor: 'a', action: 'x', decision: 'maybe' }))
      .rejects.toThrow(/Unknown agent event decision/);
  });

  test('a failed write throws only for required events', async () => {
    pool.connect.mockRejectedValue(new Error('db down'));
    await expect(AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'product.checked' })).resolves.toBeNull();
    await expect(AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'payment.started' }, { required: true }))
      .rejects.toThrow(/Agent activity log write failed: db down/);
  });

  test('listSessionEvents returns one session in order', async () => {
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'a', cartSessionId: 'cs_1' });
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'b', cartSessionId: 'cs_2' });
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'c', cartSessionId: 'cs_1' });
    const events = await AgentAudit.listSessionEvents('cs_1');
    expect(events.map((e) => e.action)).toEqual(['a', 'c']);
  });
});

describe('rule citations and the trail', () => {
  const { cite, RULES } = require('../../src/services/agentAudit/rules');

  test('cite names the rule, its version, the result and the values compared', () => {
    expect(cite('payment.ceiling', 'fail', { approvedCents: 5000, chargedCents: 5400 })).toEqual({
      rule: `payment.ceiling@v${RULES['payment.ceiling'].version}`,
      result: 'fail',
      text: RULES['payment.ceiling'].text,
      values: { approvedCents: 5000, chargedCents: 5400 },
    });
    expect(() => cite('made.up', 'pass')).toThrow(/Unknown agent rule/);
    expect(() => cite('payment.ceiling', 'maybe')).toThrow(/pass, fail or not_applicable/);
  });

  test('every entry records the rules it checked and the code that ran', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123def4567890';
    await AgentAudit.recordAgentEvent({
      actor: 'muse-agent', action: 'payment.blocked', decision: 'blocked', cartSessionId: 'cs_9', checkoutIntentId: 'ci_9',
      rules: [cite('payment.ceiling', 'fail', { approvedCents: 5000, chargedCents: 5400 })],
    });
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    expect(table[0].details.rules[0]).toMatchObject({ rule: 'payment.ceiling@v1', result: 'fail' });
    expect(table[0].details.agent.code).toBe('abc123def456');
  });

  test('getTrail lists one checkout in order, in plain fields, and flags an edited entry', async () => {
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'intent.created', cartSessionId: 'cs_1', checkoutIntentId: 'ci_1', amountCents: 9000 });
    await AgentAudit.recordAgentEvent({ actor: 'muse-agent', action: 'other.session', cartSessionId: 'cs_2' });
    await AgentAudit.recordAgentEvent({
      actor: 'shopper', action: 'intent.approved', decision: 'approved', cartSessionId: 'cs_1', checkoutIntentId: 'ci_1',
      rules: [cite('checkout.shopper_approval', 'pass')],
    });
    let trail = await AgentAudit.getTrail({ checkoutIntentId: 'ci_1' });
    expect(trail.intact).toBe(true);
    expect(trail.entries.map((e) => e.action)).toEqual(['intent.created', 'intent.approved']);
    expect(trail.entries[1].rules[0]).toMatchObject({ rule: 'checkout.shopper_approval@v1', result: 'pass' });
    expect(trail.entries[0].atPacific).toEqual(expect.any(String));

    table[0].amount_cents = 90; // someone edits the amount directly in the database
    trail = await AgentAudit.getTrail({ checkoutIntentId: 'ci_1' });
    expect(trail.intact).toBe(false);
    expect(trail.entries[0].untampered).toBe(false);
    expect(trail.entries[1].untampered).toBe(true);
  });
});
