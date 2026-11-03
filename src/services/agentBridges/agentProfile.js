/**
 * Muse's UCP platform profile.
 *
 * Every UCP store (all Shopify stores, and any merchant that publishes
 * /.well-known/ucp) fetches the calling agent's profile before it answers.
 * Without a reachable profile the store replies `profile_unreachable` and
 * nothing works. Muse serves this document at https://www.muse.shopping/.well-known/ucp
 * and sends that URL in every MCP call as meta["ucp-agent"].profile.
 *
 * Spec: https://ucp.dev/2026-08-25/specification/overview/
 *
 * Signing keys: the profile carries the PUBLIC half of Muse's signing key (JWK) in
 * `keys`. Set UCP_SIGNING_PUBLIC_JWK to that JSON. Stores use it to verify RFC 9421
 * request signatures (the "Signed" tier) and to check webhooks. The private half
 * never goes in this file or the repo.
 *
 * UCP accepts EC P-256/P-384 and OKP Ed25519 keys, so the same Ed25519 key Muse uses
 * for Web Bot Auth / Visa TAP (held in Cloud KMS) can sign UCP calls too. One key,
 * one signer, one place to rotate.
 *
 * Payment handlers: empty unless a delegated-payment rail is switched on. Setting
 * STRIPE_AGENT_PROFILE_ID declares the Stripe Payments handler (com.stripe.payments),
 * which lets Muse send a Stripe shared payment token (SPT) to stores that accept it.
 */

const UCP_VERSION = '2026-08-25';
const SPEC_BASE = `https://ucp.dev/${UCP_VERSION}`;

const DEFAULT_PROFILE_URL = 'https://www.muse.shopping/.well-known/ucp';

function getProfileUrl() {
  return (process.env.UCP_AGENT_PROFILE_URL || DEFAULT_PROFILE_URL).trim();
}

function capability(specPath, schemaName) {
  return [{
    version: UCP_VERSION,
    spec: `${SPEC_BASE}/specification/${specPath}/`,
    schema: `${SPEC_BASE}/schemas/${schemaName}.json`,
  }];
}

// JWK members that carry private key material (RFC 7517/7518). None may be published.
const PRIVATE_JWK_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k', 'oth'];

// UCP derives the algorithm from kty/crv. Anything else is refused rather than guessed.
function algorithmFor(jwk) {
  if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') return 'EdDSA';
  if (jwk.kty === 'EC' && jwk.crv === 'P-256') return 'ES256';
  if (jwk.kty === 'EC' && jwk.crv === 'P-384') return 'ES384';
  return null;
}

function parsePublicKey() {
  const raw = process.env.UCP_SIGNING_PUBLIC_JWK;
  if (!raw) return [];
  try {
    const jwk = JSON.parse(raw);
    const alg = algorithmFor(jwk);
    if (!alg) return [];
    // Never publish private key material, even if it was pasted by mistake.
    const publicOnly = { ...jwk };
    for (const member of PRIVATE_JWK_MEMBERS) delete publicOnly[member];
    return [{ use: 'sig', kid: publicOnly.kid || 'muse_2026', ...publicOnly, alg }];
  } catch (err) {
    return [];
  }
}

const STRIPE_HANDLER_VERSION = '2026-06-25';

/**
 * Delegated-payment handlers Muse can use as a UCP platform.
 * Only rails that are actually configured are declared.
 */
function buildPaymentHandlers() {
  const handlers = {};
  const stripeProfile = (process.env.STRIPE_AGENT_PROFILE_ID || '').trim();
  if (stripeProfile) {
    handlers['com.stripe.payments'] = [{
      id: 'stripe_payments',
      version: STRIPE_HANDLER_VERSION,
      spec: 'https://docs.stripe.com/agentic-commerce/protocols/ucp/stripe-payments-handler',
      schema: `https://ucp.stripe.com/payments/${STRIPE_HANDLER_VERSION}/schema.json`,
      available_instruments: [{ type: 'card' }],
      config: {
        environment: process.env.STRIPE_AGENT_ENV === 'livemode' ? 'livemode' : 'testmode',
        business_profile: stripeProfile,
      },
    }];
  }
  return handlers;
}

/**
 * Build the profile document.
 * The services and payment_handlers registries must be present even when empty.
 */
function buildAgentProfile() {
  return {
    ucp: {
      version: UCP_VERSION,
      services: {
        'dev.ucp.shopping': [{
          version: UCP_VERSION,
          spec: `${SPEC_BASE}/specification/overview/`,
          transport: 'mcp',
          schema: `${SPEC_BASE}/services/shopping/mcp.openrpc.json`,
        }],
      },
      capabilities: {
        'dev.ucp.shopping.catalog.search': capability('shopping/catalog', 'shopping/catalog_search'),
        'dev.ucp.shopping.catalog.lookup': capability('shopping/catalog', 'shopping/catalog_lookup'),
        'dev.ucp.shopping.cart': capability('shopping/cart', 'shopping/cart'),
        'dev.ucp.shopping.checkout': capability('shopping/checkout', 'shopping/checkout'),
      },
      // Muse does not hold card numbers. Until a delegated-payment rail is
      // switched on, this is empty and checkout is handed back to the store
      // (continue_url). See buildPaymentHandlers().
      payment_handlers: buildPaymentHandlers(),
    },
    keys: parsePublicKey(),
  };
}

module.exports = {
  UCP_VERSION,
  STRIPE_HANDLER_VERSION,
  buildPaymentHandlers,
  getProfileUrl,
  buildAgentProfile,
};
