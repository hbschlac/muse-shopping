/**
 * Stripe shared payment tokens (SPTs) for Muse as an agent.
 *
 * An SPT lets a store charge the shopper's payment method once, up to a cap, before
 * it expires, without Muse ever seeing a card number. The card is collected by
 * Stripe's Payment Element in the shopper's own browser; Muse's server gets only a
 * PaymentMethod ID and turns it into an SPT granted to one store's Stripe profile.
 *
 * Stripe says it may provision Visa Intelligent Commerce and Mastercard Agent Pay
 * tokens behind an SPT, which is how Mastercard and Amex shoppers get an agent rail
 * before Visa Intelligent Commerce Connect opens up.
 *
 * Used by:
 *   - UCP stores that publish com.stripe.payments (instrument built below), and
 *   - Stripe's Agentic Commerce Suite (ACP and other protocols), once Muse is in it.
 *
 * Credentials are per cart and live in memory for the request only: an SPT is
 * never stored in the database or written to logs, and never reused for another
 * cart. Each issue is recorded in the agent activity log (credential.issued,
 * required); if that write fails, the token is revoked and the payment stops.
 *
 * Off unless STRIPE_AGENT_SECRET_KEY is set. Docs:
 * https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens
 */

const STRIPE_API = 'https://api.stripe.com';
const STRIPE_PREVIEW_VERSION = '2026-09-30.preview';
const MAX_TTL_SECONDS = 30 * 60; // matches the cart's ~30 minute mandate window

class StripeSptError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'StripeSptError';
    this.status = status;
    this.code = code;
  }
}

function secretKey(env = process.env) {
  const key = (env.STRIPE_AGENT_SECRET_KEY || '').trim();
  if (!key) throw new StripeSptError('Stripe agent rail is not configured', 503, 'rail_off');
  return key;
}

async function stripeRequest(path, params, { env = process.env, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey(env)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_PREVIEW_VERSION,
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body.error || {};
    throw new StripeSptError(err.message || `Stripe returned ${res.status}`, res.status, err.code);
  }
  return body;
}

/**
 * Grant one store a capped, short-lived token on the shopper's payment method.
 * @param {object} p
 * @param {string} p.paymentMethodId pm_... from Stripe.js preparePaymentMethod
 * @param {string} p.sellerProfile the store's Stripe profile (profile_...)
 * @param {number} p.maxAmount cap in minor units (the store's quoted total)
 * @param {string} [p.currency='usd']
 * @param {number} [p.ttlSeconds=1800]
 * @param {string} [p.returnUrl] where the shopper lands after 3-D Secure
 */
async function issueSharedPaymentToken(p, opts = {}) {
  secretKey(opts.env || process.env); // rail off: stop before anything else
  if (!p || !p.paymentMethodId || !p.sellerProfile) {
    throw new StripeSptError('paymentMethodId and sellerProfile are required', 400, 'invalid_request');
  }
  if (!Number.isInteger(p.maxAmount) || p.maxAmount <= 0) {
    throw new StripeSptError('maxAmount must be a positive integer in minor units', 400, 'invalid_request');
  }
  const ttl = Math.min(p.ttlSeconds || MAX_TTL_SECONDS, MAX_TTL_SECONDS);
  const now = Math.floor((opts.now || Date.now()) / 1000);
  const params = {
    payment_method: p.paymentMethodId,
    'seller_details[network_business_profile]': p.sellerProfile,
    'usage_limits[currency]': (p.currency || 'usd').toLowerCase(),
    'usage_limits[max_amount]': String(p.maxAmount),
    'usage_limits[expires_at]': String(now + ttl),
  };
  if (p.returnUrl) params.return_url = p.returnUrl;

  // Fail closed: no activity log, no credential.
  const audit = opts.audit !== undefined ? opts.audit : loadAudit();
  if (!audit || typeof audit.recordAgentEvent !== 'function') {
    throw new StripeSptError('Agent activity log is not available', 503, 'audit_unavailable');
  }

  const spt = await stripeRequest('/v1/shared_payment/issued_tokens', params, opts);
  const ctx = p.context || {};
  try {
    await audit.recordAgentEvent({
      actor: 'muse-agent',
      action: 'credential.issued',
      decision: 'allowed',
      reason: `Stripe shared payment token for one store, capped at ${p.maxAmount} ${params['usage_limits[currency]']}`,
      rail: 'stripe_spt',
      partnerKey: ctx.partnerKey,
      userId: ctx.userId,
      cartSessionId: ctx.cartSessionId,
      checkoutIntentId: ctx.checkoutIntentId,
      amountCents: p.maxAmount,
      currency: params['usage_limits[currency]'],
      // Only the last four of the token id: the token itself is never logged.
      details: { last4: String(spt.id || '').slice(-4), expiresAt: Number(params['usage_limits[expires_at]']) },
    }, { required: true });
  } catch (err) {
    await revokeSharedPaymentToken(spt.id, opts).catch(() => {});
    throw new StripeSptError('Could not record the credential; payment stopped', 503, 'audit_failed');
  }
  return spt;
}

function loadAudit() {
  try {
    return require('../agentAudit');
  } catch (err) {
    return null;
  }
}

async function revokeSharedPaymentToken(sptId, opts = {}) {
  if (!/^spt_/.test(sptId || '')) throw new StripeSptError('not an SPT id', 400, 'invalid_request');
  return stripeRequest(`/v1/shared_payment/issued_tokens/${encodeURIComponent(sptId)}/revoke`, {}, opts);
}

/**
 * The payment instrument for a UCP complete_checkout at a com.stripe.payments store.
 */
function buildUcpStripeInstrument(sptId) {
  if (!/^spt_/.test(sptId || '')) throw new StripeSptError('not an SPT id', 400, 'invalid_request');
  const instrument = {
    id: 'instr_1',
    handler_id: 'stripe_payments',
    type: 'card',
    selected: true,
    credential: { type: 'stripe_payment_token', token: sptId },
  };
  return { payment: { instruments: [instrument] } };
}

module.exports = {
  STRIPE_PREVIEW_VERSION,
  MAX_TTL_SECONDS,
  StripeSptError,
  issueSharedPaymentToken,
  revokeSharedPaymentToken,
  buildUcpStripeInstrument,
};
