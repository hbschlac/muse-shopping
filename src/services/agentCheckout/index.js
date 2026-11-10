/**
 * Agent checkout: one review screen, one confirmation, Muse pays every store.
 *
 *   prepare(userId)  builds each partner store's checkout (BridgeCartService),
 *                    picks a payment rail per store, and saves a checkout
 *                    intent: the stores, items, per-store price ceiling and a
 *                    30-minute expiry. Returns what the review screen shows,
 *                    plus a summaryHash of it.
 *   confirm(userId, intentId, { summaryHash, ... })
 *                    the shopper's single confirm step. The client echoes the
 *                    summaryHash so the shopper can only approve exactly what
 *                    they saw. Muse then pays each store on its rail, in
 *                    parallel, and every store it can't pay falls back to
 *                    "Check out at {store}" with the store's continue_url.
 *
 * Rules (hannah, 2026-11-02 PST):
 *   - Muse never stores a card. A rail gets a network token and a fresh
 *     cryptogram (or a checkout-scoped Shop Token / SPT) for this cart only,
 *     keeps it in memory for the one request, and never writes it anywhere.
 *   - Every agent step is in the agent activity log. intent.approved and
 *     payment.submitted are required writes: if the log can't record them,
 *     Muse doesn't pay.
 *   - A store is never charged more than its ceiling (the quoted total the
 *     shopper approved). Rails pass the ceiling to the network (Visa mandate
 *     decline threshold, SPT max_amount), and Muse blocks a store whose final
 *     total comes back higher.
 *
 * Rails plug in with registerRail(name, { pay }). None is registered yet, so
 * today every store hands off: the confirm step is safe to ship before any
 * partner approves Muse. pay() receives { intent, store, ctx } and returns
 * { status: 'paid', orderId, totalCents } or throws.
 */

const crypto = require('crypto');
const pool = require('../../db/pool');
const logger = require('../../utils/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');
const { recordAgentEvent, cite } = require('../agentAudit');
const AgentBridges = require('../agentBridges');
const BridgeCartService = require('../bridgeCartService');
const { SCHEMA_SQL } = require('./schema');

const ACTOR = 'muse-agent';
const INTENT_TTL_MS = 30 * 60 * 1000;
const PAY_TIMEOUT_MS = 20000;
const SCHEMA_LOCK_KEY = 4172027;

const rails = new Map();

/** Register a payment rail (shop_pay, visa_ic, stripe_spt, ...). */
function registerRail(name, impl) {
  if (!impl || typeof impl.pay !== 'function') throw new Error(`Rail ${name} needs a pay() function`);
  rails.set(name, impl);
}

function unregisterRail(name) {
  rails.delete(name);
}

function loadRailSelector() {
  try {
    return require('../agentPayments');
  } catch (err) {
    return null;
  }
}

let schemaReady = null;
async function applySchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEMA_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = applySchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Pick a rail for one store. A rail counts only if Muse has it registered. */
async function pickRail(partnerKey, ctx) {
  const partner = AgentBridges.getPartner(partnerKey) || {};
  const handlers = partner.paymentHandlers || [];
  const selector = loadRailSelector();
  let choice = { rail: 'handoff', handler: null, reason: 'no payment rail is switched on for Muse' };
  if (selector && typeof selector.chooseRail === 'function') {
    choice = await selector.chooseRail(handlers, { partnerKey, ...ctx });
  } else {
    await recordAgentEvent({
      actor: ACTOR, action: 'rail.selected', decision: 'info', reason: choice.reason,
      rail: 'handoff', partnerKey, ...ctx, details: { handlers },
      rules: [cite('rail.installed', 'fail', { storeOffers: handlers.length, museHas: rails.size })],
    });
  }
  if (choice.rail !== 'handoff' && !rails.has(choice.rail)) {
    return { rail: 'handoff', handler: null, reason: `${choice.rail} is switched on but its payment code isn't installed` };
  }
  return choice;
}

/** Stable hash of exactly what the review screen shows. */
function summaryHashOf(summary) {
  const stores = summary.stores
    .map((s) => [s.partnerKey, s.rail, s.ceilingCents, s.currency, s.itemCount])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return crypto.createHash('sha256')
    .update(JSON.stringify({ id: summary.intentId, total: summary.totalCents, currency: summary.currency, stores }))
    .digest('hex');
}

/**
 * Build store checkouts, pick rails, and save the intent for review.
 * @returns review data: { intentId, cartSessionId, expiresAt, totalCents, currency,
 *   stores: [{ partnerKey, storeName, rail, railReason, itemCount, ceilingCents,
 *   currency, continueUrl }], errors, shipTo, summaryHash }
 */
async function prepare(userId, { email = null, shippingAddress = null, partnerKeys = null } = {}) {
  await ensureSchema();
  const bridge = await BridgeCartService.startCheckout(userId, { email, shippingAddress, partnerKeys });
  const { cartSessionId } = bridge;
  if (!bridge.stores.length) {
    throw new ValidationError('No partner store could build a checkout for this cart');
  }

  const intentId = `ci_${crypto.randomUUID()}`;
  const ctx = { userId, cartSessionId, checkoutIntentId: intentId };
  const stores = [];
  for (const s of bridge.stores) {
    const choice = await pickRail(s.partnerKey, ctx);
    const quoted = s.checkout.totals?.total?.cents ?? null;
    stores.push({
      partnerKey: s.partnerKey,
      storeName: s.storeName,
      rail: quoted == null ? 'handoff' : choice.rail,
      railReason: quoted == null ? 'store did not return a total' : choice.reason,
      itemCount: s.itemCount,
      checkoutId: s.checkout.id || null,
      continueUrl: s.checkout.continueUrl || null,
      quotedCents: quoted,
      ceilingCents: quoted,
      currency: s.checkout.currency || 'USD',
    });
  }

  const currency = stores[0].currency;
  const totalCents = stores.reduce((n, s) => n + (s.quotedCents || 0), 0);
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);
  const summary = { intentId, totalCents, currency, stores };
  const summaryHash = summaryHashOf(summary);

  await pool.query(
    `INSERT INTO checkout_intents (id, user_id, cart_session_id, status, total_cents, currency, summary_hash, expires_at)
     VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)`,
    [intentId, userId, cartSessionId, totalCents, currency, summaryHash, expiresAt.toISOString()],
  );
  for (const s of stores) {
    await pool.query(
      `INSERT INTO checkout_intent_stores
         (intent_id, partner_key, store_name, rail, rail_reason, checkout_id, continue_url,
          item_count, quoted_cents, ceiling_cents, currency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [intentId, s.partnerKey, s.storeName, s.rail, s.railReason, s.checkoutId, s.continueUrl,
        s.itemCount, s.quotedCents, s.ceilingCents, s.currency, s.rail === 'handoff' ? 'handoff' : 'pending'],
    );
  }

  await recordAgentEvent({
    actor: ACTOR, action: 'intent.created', decision: 'info',
    reason: `Review ready: ${stores.length} store(s), ${stores.filter((s) => s.rail !== 'handoff').length} payable by Muse`,
    ...ctx, amountCents: totalCents, currency,
    details: {
      expiresAt: expiresAt.toISOString(),
      summaryHash,
      stores: stores.map((s) => ({ partnerKey: s.partnerKey, rail: s.rail, railReason: s.railReason, ceilingCents: s.ceilingCents })),
    },
    rules: [
      ...stores.map((s) => cite('rail.store_total', s.quotedCents == null ? 'fail' : 'pass', { store: s.partnerKey, quotedCents: s.quotedCents })),
      ...stores.map((s) => cite('rail.installed', s.rail === 'handoff' ? 'fail' : 'pass', { store: s.partnerKey, rail: s.rail })),
      cite('payment.ceiling', 'not_applicable', { ceilingsSetTo: 'each store\'s quoted total' }),
      cite('checkout.not_expired', 'not_applicable', { expiresAt: expiresAt.toISOString() }),
    ],
  });

  return {
    intentId, cartSessionId, expiresAt: expiresAt.toISOString(), totalCents, currency,
    stores: stores.map(({ checkoutId, quotedCents, ...shown }) => shown),
    errors: bridge.errors, shipTo: bridge.shipTo, summaryHash,
  };
}

async function loadIntent(userId, intentId) {
  await ensureSchema();
  const intent = (await pool.query('SELECT * FROM checkout_intents WHERE id = $1 AND user_id = $2', [intentId, userId])).rows[0];
  if (!intent) throw new NotFoundError('Checkout');
  const stores = (await pool.query('SELECT * FROM checkout_intent_stores WHERE intent_id = $1 ORDER BY id', [intentId])).rows;
  return { intent, stores };
}

function publicStore(row) {
  return {
    partnerKey: row.partner_key, storeName: row.store_name, rail: row.rail, status: row.status,
    ceilingCents: row.ceiling_cents, currency: row.currency, orderId: row.order_id,
    continueUrl: row.status === 'paid' ? null : row.continue_url, error: row.error,
  };
}

async function getIntent(userId, intentId) {
  const { intent, stores } = await loadIntent(userId, intentId);
  return {
    intentId: intent.id, status: intent.status, expiresAt: new Date(intent.expires_at).toISOString(),
    totalCents: intent.total_cents, currency: intent.currency, stores: stores.map(publicStore),
  };
}

async function setStore(row, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  await pool.query(`UPDATE checkout_intent_stores SET ${sets} WHERE id = $1`, [row.id, ...keys.map((k) => fields[k])]);
  Object.assign(row, fields);
}

async function payStore(intent, row, confirmation) {
  const ctx = { userId: intent.user_id, cartSessionId: intent.cart_session_id, checkoutIntentId: intent.id };
  const base = { ...ctx, partnerKey: row.partner_key, rail: row.rail, currency: row.currency };
  const rail = rails.get(row.rail);
  if (!rail) {
    await setStore(row, { status: 'handoff', error: 'payment rail not available' });
    await recordAgentEvent({
      actor: ACTOR, action: 'handoff.offered', decision: 'info', reason: 'rail not available at pay time', ...base,
      rules: [cite('rail.installed', 'fail', { rail: row.rail })],
    });
    return row;
  }

  // Required: no log entry, no payment.
  await recordAgentEvent({
    actor: ACTOR, action: 'payment.submitted', decision: 'allowed',
    reason: `Paying ${row.store_name} up to the approved ${row.ceiling_cents}`,
    ...base, amountCents: row.ceiling_cents, details: { checkoutId: row.checkout_id },
    rules: [
      cite('checkout.shopper_approval', 'pass'),
      cite('payment.logged_first', 'pass'),
      cite('payment.ceiling', 'not_applicable', { approvedCents: row.ceiling_cents, note: 'checked again on the store\'s answer' }),
      cite('payment.no_card_storage', 'pass'),
    ],
  }, { required: true });

  let result;
  try {
    result = await withTimeout(
      rail.pay({
        intent: { id: intent.id, userId: intent.user_id, cartSessionId: intent.cart_session_id, expiresAt: intent.expires_at },
        store: {
          partnerKey: row.partner_key, storeName: row.store_name, checkoutId: row.checkout_id,
          ceilingCents: row.ceiling_cents, currency: row.currency,
        },
        confirmation,
        ctx,
      }),
      PAY_TIMEOUT_MS, `${row.rail} payment at ${row.partner_key}`,
    );
  } catch (err) {
    await setStore(row, { status: 'failed', error: err.message });
    await recordAgentEvent({
      actor: `store:${row.partner_key}`, action: 'payment.failed', decision: 'error', reason: err.message, ...base,
    });
    return row;
  }

  if (Number.isInteger(result?.totalCents) && result.totalCents > row.ceiling_cents) {
    // The network cap should have declined this. Record it loudly for review.
    await setStore(row, { status: 'blocked', error: `charged ${result.totalCents}, above approved ${row.ceiling_cents}`, order_id: result.orderId || null });
    await recordAgentEvent({
      actor: ACTOR, action: 'payment.blocked', decision: 'blocked',
      reason: `Store total ${result.totalCents} is above the approved ${row.ceiling_cents}`,
      ...base, amountCents: result.totalCents, details: { orderId: result.orderId || null },
      rules: [cite('payment.ceiling', 'fail', { approvedCents: row.ceiling_cents, chargedCents: result.totalCents })],
    });
    return row;
  }

  await setStore(row, { status: 'paid', order_id: result?.orderId || null, error: null });
  await recordAgentEvent({
    actor: `store:${row.partner_key}`, action: 'payment.completed', decision: 'approved',
    reason: `Order placed at ${row.store_name}`, ...base,
    amountCents: Number.isInteger(result?.totalCents) ? result.totalCents : row.ceiling_cents,
    details: { orderId: result?.orderId || null },
    rules: [cite('payment.ceiling', Number.isInteger(result?.totalCents) ? 'pass' : 'not_applicable', {
      approvedCents: row.ceiling_cents, chargedCents: Number.isInteger(result?.totalCents) ? result.totalCents : null,
    })],
  });
  return row;
}

/**
 * The shopper's one confirm step for the whole cart.
 * @param {object} confirmation { summaryHash, ...rail-specific approval data such
 *   as a passkey assertion or a Stripe PaymentMethod id }. Never stored.
 */
async function confirm(userId, intentId, confirmation = {}) {
  const { intent, stores } = await loadIntent(userId, intentId);
  const ctx = { userId, cartSessionId: intent.cart_session_id, checkoutIntentId: intent.id };

  if (intent.status !== 'draft') throw new ConflictError(`This checkout is already ${intent.status}`);
  if (new Date(intent.expires_at).getTime() < Date.now()) {
    await pool.query("UPDATE checkout_intents SET status = 'expired', finished_at = NOW() WHERE id = $1 AND status = 'draft'", [intent.id]);
    await recordAgentEvent({
      actor: 'system', action: 'intent.expired', decision: 'declined', reason: 'Confirmed after the 30-minute window', ...ctx,
      rules: [cite('checkout.not_expired', 'fail', { expiresAt: new Date(intent.expires_at).toISOString() })],
    });
    throw new ConflictError('This checkout expired. Review the cart again.');
  }
  if (!confirmation.summaryHash || confirmation.summaryHash !== intent.summary_hash) {
    await recordAgentEvent({
      actor: 'shopper', action: 'intent.declined', decision: 'blocked',
      reason: 'Confirmation did not match the review the shopper was shown', ...ctx,
      rules: [cite('checkout.review_matches', 'fail')],
    });
    throw new ValidationError('The cart changed since you reviewed it. Review it again.');
  }

  // The shopper's passkey tap, bound to this exact review, before anything is claimed or paid.
  let approvedBy = { method: 'confirm' };
  if (passkeyRequired()) {
    try {
      const pk = await passkeys().verifyCartApproval(userId, intent.id, intent.summary_hash, confirmation.passkey);
      approvedBy = { method: 'passkey', credentialId: pk.credentialId, userVerified: pk.userVerified };
    } catch (err) {
      await recordAgentEvent({
        actor: 'shopper', action: 'intent.declined', decision: 'blocked',
        reason: `Passkey check failed: ${err.message}`, ...ctx,
        rules: [cite('checkout.review_matches', 'pass'), cite('checkout.shopper_approval', 'fail')],
      });
      throw err;
    }
  }

  // Only one confirm can win, even with a double tap.
  const claimed = await pool.query(
    "UPDATE checkout_intents SET status = 'paying', approved_at = NOW() WHERE id = $1 AND status = 'draft' RETURNING id",
    [intent.id],
  );
  if (!claimed.rows.length) throw new ConflictError('This checkout is already being paid');

  // Required: the shopper's approval must be on record before anything is paid.
  try {
    await recordAgentEvent({
      actor: 'shopper', action: 'intent.approved', decision: 'approved',
      reason: `Shopper confirmed ${stores.length} store(s) in one step`,
      ...ctx, amountCents: intent.total_cents, currency: intent.currency,
      details: { summaryHash: intent.summary_hash, ...approvedBy },
      rules: [
        cite('checkout.not_expired', 'pass', { expiresAt: new Date(intent.expires_at).toISOString() }),
        cite('checkout.review_matches', 'pass', { summaryHash: intent.summary_hash }),
        cite('checkout.shopper_approval', approvedBy.method === 'passkey' ? 'pass' : 'not_applicable', { method: approvedBy.method }),
        cite('checkout.one_confirm', 'pass'),
      ],
    }, { required: true });
  } catch (err) {
    await pool.query("UPDATE checkout_intents SET status = 'draft', approved_at = NULL WHERE id = $1", [intent.id]).catch(() => {});
    throw err;
  }

  const payable = stores.filter((s) => s.status === 'pending');
  await Promise.all(payable.map((row) => payStore(intent, row, confirmation).catch(async (err) => {
    // payment.submitted could not be logged: nothing was paid at this store.
    logger.error(`Agent checkout: ${row.partner_key} not paid: ${err.message}`);
    await setStore(row, { status: 'handoff', error: 'Muse could not record the payment, so it did not pay' }).catch(() => {});
  })));

  for (const row of stores.filter((s) => s.status === 'failed' || s.status === 'handoff')) {
    if (row.continue_url) {
      await recordAgentEvent({
        actor: ACTOR, action: 'handoff.offered', decision: 'info',
        reason: `Shopper checks out on ${row.store_name}'s site`, ...ctx, partnerKey: row.partner_key, rail: row.rail,
        rules: [cite('rail.installed', row.status === 'handoff' ? 'fail' : 'not_applicable', { rail: row.rail, storeStatus: row.status })],
      });
    }
  }

  await pool.query("UPDATE checkout_intents SET status = 'done', finished_at = NOW() WHERE id = $1", [intent.id]);
  return getIntent(userId, intentId);
}

/** Passkey approval is required unless AGENT_CHECKOUT_PASSKEY=off (local testing only). */
function passkeyRequired() {
  return process.env.AGENT_CHECKOUT_PASSKEY !== 'off';
}
function passkeys() {
  return require('../passkeys');
}

/**
 * WebAuthn options for the shopper's passkey tap on this cart. The challenge
 * is bound to the intent and the review the shopper saw.
 */
async function approvalOptions(userId, intentId) {
  const { intent } = await loadIntent(userId, intentId);
  if (intent.status !== 'draft') throw new ConflictError(`This checkout is already ${intent.status}`);
  if (new Date(intent.expires_at).getTime() < Date.now()) throw new ConflictError('This checkout expired. Review the cart again.');
  const hasKey = await passkeys().hasPasskey(userId);
  if (!hasKey) return { needsPasskey: true };
  return { needsPasskey: false, options: await passkeys().cartApprovalOptions(userId, intent.id, intent.summary_hash) };
}

/** The shopper backed out of the review screen. */
async function cancel(userId, intentId) {
  const { intent } = await loadIntent(userId, intentId);
  const res = await pool.query(
    "UPDATE checkout_intents SET status = 'cancelled', finished_at = NOW() WHERE id = $1 AND status = 'draft' RETURNING id",
    [intent.id],
  );
  if (!res.rows.length) throw new ConflictError(`This checkout is already ${intent.status}`);
  await recordAgentEvent({
    actor: 'shopper', action: 'intent.cancelled', decision: 'declined', reason: 'Shopper left the review screen',
    userId, cartSessionId: intent.cart_session_id, checkoutIntentId: intent.id,
  });
  return getIntent(userId, intentId);
}

module.exports = {
  prepare,
  confirm,
  approvalOptions,
  cancel,
  getIntent,
  registerRail,
  unregisterRail,
  ensureSchema,
  INTENT_TTL_MS,
  _internal: { summaryHashOf, rails },
};
