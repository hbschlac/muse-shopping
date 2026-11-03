/**
 * Agent activity log: one backend record of every action and decision Muse's
 * agent takes for a shopper, for accountability and fraud review.
 *
 * Every agent step calls recordAgentEvent(): checking a product's live price
 * and stock, creating a store checkout, filling in buyer and shipping details,
 * choosing a payment rail, the shopper's approval, getting a network token and
 * cryptogram, completing or failing a payment, and any refusal.
 *
 * Guarantees (see migrations/080_create_agent_events.sql):
 *   - Append-only. The table rejects UPDATE, DELETE and TRUNCATE.
 *   - Tamper-evident. Each row's hash covers its content and the previous
 *     row's hash; verifyChain() recomputes it.
 *   - No card data. redact() removes card numbers, CVVs, network tokens,
 *     cryptograms, Shop Tokens, passkey assertions and secrets before insert.
 *
 * Failure policy: pass { required: true } for any step that moves money or
 * records the shopper's approval. If the log write fails, that call throws and
 * the caller must not go ahead with the payment. Other events log the error
 * and let shopping continue.
 */

const crypto = require('crypto');
const pool = require('../../db/pool');
const logger = require('../../utils/logger');
const { SCHEMA_SQL } = require('./schema');

const DECISIONS = new Set(['info', 'allowed', 'blocked', 'approved', 'declined', 'error']);
const LOCK_KEY = 4172025; // pg advisory lock id that serializes the hash chain
const MAX_DETAILS_BYTES = 16 * 1024;
const REDACTED = '[redacted]';

// Keys whose values are never stored, at any depth.
const SECRET_KEY = /(^|_|-)(pan|cvv|cvc|cvv2|cryptogram|eci|token|tokens|shop_?token|card_?number|account_?number|number|secret|password|passcode|otp|authorization|cookie|signature|signature_input|assurance_?data|fido_?blob|private_?key|jwk|api_?key)$/i;
// Keys that are safe even though they match the pattern above.
const SAFE_KEY = /^(last4|last_4|token_?type|token_?id_?last4|order_?number|phone_?number_?last4|tokens_?count)$/i;
// 13-19 digits, optionally separated by spaces or dashes: looks like a card number.
const CARD_NUMBER = /\b(?:\d[ -]?){12,18}\d\b/g;

function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function scrubString(value) {
  return value.replace(CARD_NUMBER, (match) => {
    const digits = match.replace(/\D/g, '');
    return luhnValid(digits) ? `[card ...${digits.slice(-4)}]` : match;
  });
}

// "accessToken" -> "access_token", "CVV2" -> "cvv2", so one pattern covers both styles.
function snakeKey(key) {
  return String(key).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[- ]/g, '_').toLowerCase();
}

/** Deep copy with card data and secrets removed. */
function redact(value, depth = 0) {
  if (depth > 8) return '[truncated]';
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    const k = snakeKey(key);
    out[key] = SECRET_KEY.test(k) && !SAFE_KEY.test(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

/** JSON with object keys sorted at every level, so hashing is stable. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

const HASHED_FIELDS = [
  'occurred_at', 'user_id', 'cart_session_id', 'checkout_intent_id', 'actor', 'action',
  'decision', 'reason', 'partner_key', 'rail', 'amount_cents', 'currency', 'details', 'request_id',
];

function hashRow(row, prevHash) {
  const content = {};
  for (const field of HASHED_FIELDS) {
    let v = row[field];
    if (v instanceof Date) v = v.toISOString();
    content[field] = v === undefined ? null : v;
  }
  return crypto.createHash('sha256').update(`${prevHash || ''}|${canonicalJson(content)}`).digest('hex');
}

function limitDetails(details) {
  const json = JSON.stringify(details);
  if (Buffer.byteLength(json) <= MAX_DETAILS_BYTES) return details;
  return { truncated: true, preview: json.slice(0, 2000) };
}

function buildRow(event) {
  if (!event || !event.actor || !event.action) {
    throw new Error('recordAgentEvent needs at least actor and action');
  }
  const decision = event.decision || 'info';
  if (!DECISIONS.has(decision)) {
    throw new Error(`Unknown agent event decision "${decision}"`);
  }
  return {
    occurred_at: new Date().toISOString(),
    user_id: event.userId ?? null,
    cart_session_id: event.cartSessionId ?? null,
    checkout_intent_id: event.checkoutIntentId ?? null,
    actor: String(event.actor),
    action: String(event.action),
    decision,
    reason: event.reason ? scrubString(String(event.reason)) : null,
    partner_key: event.partnerKey ?? null,
    rail: event.rail ?? null,
    amount_cents: Number.isInteger(event.amountCents) ? event.amountCents : null,
    currency: event.currency ?? null,
    details: limitDetails(redact(event.details || {})),
    request_id: event.requestId ?? null,
  };
}

let schemaReady = null;
const SCHEMA_LOCK_KEY = 4172026;

async function applySchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize cold starts: parallel CREATE ... IF NOT EXISTS can still collide.
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

/** Create agent_events on first use (production migrations are run by hand). */
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = applySchema().catch((err) => {
      schemaReady = null; // try again on the next call
      throw err;
    });
  }
  return schemaReady;
}

async function insertChained(row) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    const last = await client.query('SELECT hash FROM agent_events ORDER BY id DESC LIMIT 1');
    const prevHash = last.rows[0] ? last.rows[0].hash : null;
    const hash = hashRow(row, prevHash);
    const result = await client.query(
      `INSERT INTO agent_events
         (occurred_at, user_id, cart_session_id, checkout_intent_id, actor, action, decision, reason,
          partner_key, rail, amount_cents, currency, details, request_id, prev_hash, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [row.occurred_at, row.user_id, row.cart_session_id, row.checkout_intent_id, row.actor, row.action,
        row.decision, row.reason, row.partner_key, row.rail, row.amount_cents, row.currency,
        JSON.stringify(row.details), row.request_id, prevHash, hash],
    );
    await client.query('COMMIT');
    return { id: result.rows[0].id, hash };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Record one agent action or decision.
 * @param {object} event
 *   actor, action (required); decision ('info' default), reason, userId,
 *   cartSessionId, checkoutIntentId, partnerKey, rail, amountCents, currency,
 *   details (any object, redacted before storage), requestId.
 * @param {object} [opts] { required: true } throws if the write fails.
 * @returns {Promise<{id, hash}|null>}
 */
async function recordAgentEvent(event, opts = {}) {
  const row = buildRow(event);
  try {
    return await insertChained(row);
  } catch (err) {
    if (opts.required) throw new Error(`Agent activity log write failed: ${err.message}`);
    logger.error(`Agent activity log write failed for ${row.action}: ${err.message}`);
    return null;
  }
}

/** Events for one shopping session, oldest first (for review and support). */
async function listSessionEvents(cartSessionId) {
  await ensureSchema();
  const result = await pool.query(
    'SELECT * FROM agent_events WHERE cart_session_id = $1 ORDER BY id ASC',
    [cartSessionId],
  );
  return result.rows;
}

/**
 * Recompute the hash chain from the start (or from afterId) and report the
 * first row that doesn't match.
 * @returns {Promise<{ok: boolean, checked: number, brokenAt?: number}>}
 */
async function verifyChain({ afterId = 0, limit = 10000 } = {}) {
  await ensureSchema();
  let prevHash = null;
  if (afterId > 0) {
    const prev = await pool.query('SELECT hash FROM agent_events WHERE id = $1', [afterId]);
    prevHash = prev.rows[0] ? prev.rows[0].hash : null;
  }
  const result = await pool.query(
    'SELECT * FROM agent_events WHERE id > $1 ORDER BY id ASC LIMIT $2',
    [afterId, limit],
  );
  let checked = 0;
  for (const row of result.rows) {
    const expected = hashRow(row, prevHash);
    if ((row.prev_hash || null) !== prevHash || row.hash !== expected) {
      return { ok: false, checked, brokenAt: Number(row.id) };
    }
    prevHash = row.hash;
    checked += 1;
  }
  return { ok: true, checked };
}

module.exports = {
  recordAgentEvent,
  listSessionEvents,
  verifyChain,
  ensureSchema,
  redact,
  _internal: { hashRow, canonicalJson, buildRow, luhnValid },
};
