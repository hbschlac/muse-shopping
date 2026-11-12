/**
 * "Sign in with Shop" (UCP identity linking), step 1: a test that Shop will
 * accept Muse as an app without Shopify registering it first.
 *
 * UCP identity linking is OAuth 2.0. 66 of Muse's partner stores list Shop
 * (accounts.shop.app) as their login provider. Shop's login server advertises
 * `client_id_metadata_document_supported: true`: an app can identify itself by
 * publishing a small JSON file and using that file's URL as its client_id,
 * with no client secret (a "public client" using PKCE).
 *
 * This module only builds that JSON file. Nothing here exchanges codes or
 * stores tokens: the callback route records whether Shop sent a code back and
 * throws the code away. Real linking (token exchange, storage, revocation) is
 * a later PR, and only if this test shows Shop accepts Muse.
 */

const SITE = 'https://www.muse.shopping';
const CLIENT_PATH = '/api/v1/identity/shop/client.json';
const CALLBACK_PATH = '/api/v1/identity/shop/callback';

const SHOP_ISSUER = 'https://accounts.shop.app';
const SHOP_AUTHORIZE = `${SHOP_ISSUER}/oauth/authorize`;

function clientId() {
  return `${SITE}${CLIENT_PATH}`;
}

function redirectUri() {
  return `${SITE}${CALLBACK_PATH}`;
}

/** The client metadata document. Its client_id must equal the URL it is served at. */
function buildClientMetadata() {
  return {
    client_id: clientId(),
    client_name: 'Muse',
    client_uri: SITE,
    policy_uri: `${SITE}/privacy`,
    redirect_uris: [redirectUri()],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: 'openid email dev.ucp.shopping.checkout:manage',
  };
}

/**
 * Short, fixed list of the callback's query fields we keep. The `code` itself
 * is never kept or logged: only whether one arrived.
 */
function summarizeCallback(query = {}) {
  const pick = (v) => (typeof v === 'string' ? v.slice(0, 300) : null);
  return {
    accepted: typeof query.code === 'string' && query.code.length > 0,
    error: pick(query.error),
    error_description: pick(query.error_description),
    issuer: pick(query.iss),
    state_present: typeof query.state === 'string' && query.state.length > 0,
  };
}

module.exports = {
  SHOP_ISSUER,
  SHOP_AUTHORIZE,
  CLIENT_PATH,
  CALLBACK_PATH,
  clientId,
  redirectUri,
  buildClientMetadata,
  summarizeCallback,
};
