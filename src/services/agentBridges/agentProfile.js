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
 * Signing keys: the profile carries the PUBLIC half of an EC P-256 key (JWK) in
 * `keys`. Set UCP_SIGNING_PUBLIC_JWK to that JSON. Stores use it to verify RFC 9421
 * request signatures (the "Signed" tier) and to check webhooks. The private half
 * never goes in this file or the repo.
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

function parsePublicKey() {
  const raw = process.env.UCP_SIGNING_PUBLIC_JWK;
  if (!raw) return [];
  try {
    const jwk = JSON.parse(raw);
    // Never publish private key material, even if it was pasted by mistake.
    const { d, ...publicOnly } = jwk;
    return [{ use: 'sig', alg: 'ES256', kid: publicOnly.kid || 'muse_2026', ...publicOnly }];
  } catch (err) {
    return [];
  }
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
      // Muse does not hold or forward payment credentials. Checkout is handed
      // back to the store (continue_url) until a delegated-payment handler
      // (Shop Pay, Stripe shared payment tokens) is approved for Muse.
      payment_handlers: {},
    },
    keys: parsePublicKey(),
  };
}

module.exports = {
  UCP_VERSION,
  getProfileUrl,
  buildAgentProfile,
};
