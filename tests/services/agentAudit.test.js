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
    return { rows: [] };
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
    expect(table[0].details).toEqual({ checkoutId: 'chk_1', credential: { token: '[redacted]' } });
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
