/**
 * Pick how Muse pays at one store.
 *
 * A UCP store lists the payment handlers it accepts (partners.json `paymentHandlers`,
 * or the `payment_handlers` object in its /.well-known/ucp). Muse can only use a
 * handler whose rail is switched on for Muse. When none match, the shopper checks
 * out on the store's own site (continue_url handoff), which is what happens today.
 *
 * Rails are switched on by configuration only after the partner approves Muse:
 *   shop_pay    dev.shopify.shop_pay   MUSE_RAIL_SHOP_PAY=on (Shopify approval)
 *   stripe_spt  com.stripe.payments    STRIPE_AGENT_SECRET_KEY + STRIPE_AGENT_PROFILE_ID
 *   google_pay  com.google.pay         MUSE_RAIL_GOOGLE_PAY=on (Google approval)
 *
 * No rail ever means a hidden browser. A rail either hands the store an
 * agent-scoped token through the store's published protocol, or Muse hands off.
 */

const RAILS = [
  { rail: 'shop_pay', handler: 'dev.shopify.shop_pay', isOn: env => env.MUSE_RAIL_SHOP_PAY === 'on' },
  {
    rail: 'stripe_spt',
    handler: 'com.stripe.payments',
    isOn: env => Boolean(env.STRIPE_AGENT_SECRET_KEY && env.STRIPE_AGENT_PROFILE_ID),
  },
  { rail: 'google_pay', handler: 'com.google.pay', isOn: env => env.MUSE_RAIL_GOOGLE_PAY === 'on' },
];

function handlerNames(storeHandlers) {
  if (!storeHandlers) return [];
  if (Array.isArray(storeHandlers)) return storeHandlers;
  return Object.keys(storeHandlers);
}

function enabledRails(env = process.env) {
  return RAILS.filter(r => r.isOn(env)).map(r => r.rail);
}

/**
 * @param {string[]|object} storeHandlers handler names, or a UCP payment_handlers object
 * @param {object} env defaults to process.env
 * @returns {{rail: string, handler: string|null, reason: string}}
 */
function selectRail(storeHandlers, env = process.env) {
  const accepted = new Set(handlerNames(storeHandlers));
  for (const r of RAILS) {
    if (!accepted.has(r.handler)) continue;
    if (!r.isOn(env)) continue;
    return { rail: r.rail, handler: r.handler, reason: `store accepts ${r.handler}` };
  }
  const offered = RAILS.filter(r => accepted.has(r.handler)).map(r => r.handler);
  return {
    rail: 'handoff',
    handler: null,
    reason: offered.length
      ? `store accepts ${offered.join(', ')} but that rail is not switched on for Muse`
      : 'store accepts no handler Muse supports',
  };
}

function loadAudit() {
  try {
    return require('../agentAudit');
  } catch (err) {
    return null;
  }
}

/**
 * selectRail plus the activity-log entry (rail.selected) with its reason.
 * Logging here is not required: choosing a rail moves no money.
 * @param {string[]|object} storeHandlers
 * @param {object} ctx { partnerKey, userId, cartSessionId, checkoutIntentId }
 */
async function chooseRail(storeHandlers, ctx = {}, { env = process.env, audit = loadAudit() } = {}) {
  const choice = selectRail(storeHandlers, env);
  if (audit && typeof audit.recordAgentEvent === 'function') {
    await audit.recordAgentEvent({
      actor: 'muse-agent',
      action: 'rail.selected',
      decision: choice.rail === 'handoff' ? 'info' : 'allowed',
      reason: choice.reason,
      rail: choice.rail,
      partnerKey: ctx.partnerKey,
      userId: ctx.userId,
      cartSessionId: ctx.cartSessionId,
      checkoutIntentId: ctx.checkoutIntentId,
      details: { handler: choice.handler },
    });
  }
  return choice;
}

module.exports = { RAILS, enabledRails, selectRail, chooseRail };
