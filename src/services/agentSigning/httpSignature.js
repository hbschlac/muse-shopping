/**
 * RFC 9421 HTTP Message Signatures, the format used by Web Bot Auth and by
 * Visa's Trusted Agent Protocol (TAP).
 *
 * This file only builds strings. It never sees key material: the bytes it
 * produces are handed to a Signer (see index.js), which in production is a
 * Cloud KMS key that cannot be exported.
 */

const crypto = require('crypto');

// Tags this codebase is allowed to sign. Anything else is refused, so a bug or
// an attacker cannot use Muse's identity to sign an arbitrary purpose.
const TAGS = Object.freeze({
  WEB_BOT_AUTH: 'web-bot-auth',
  TAP_BROWSE: 'agent-browser-auth',
  TAP_PAY: 'agent-payer-auth',
  DIRECTORY: 'http-message-signatures-directory',
});

// TAP caps a signature's lifetime at 8 minutes. We go shorter: a stolen
// header is only replayable until it expires.
const MAX_TTL_SECONDS = 8 * 60;
const DEFAULT_TTL_SECONDS = 60;

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

/** RFC 7638 JWK thumbprint. Web Bot Auth uses it as the keyid. */
function jwkThumbprint(jwk) {
  let members;
  if (jwk.kty === 'OKP') members = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
  else if (jwk.kty === 'EC') members = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
  else if (jwk.kty === 'RSA') members = { e: jwk.e, kty: jwk.kty, n: jwk.n };
  else throw new Error(`Unsupported JWK kty: ${jwk.kty}`);
  return b64url(crypto.createHash('sha256').update(JSON.stringify(members)).digest());
}

function sfString(value) {
  const s = String(value);
  if (/[^\x20-\x7e]/.test(s)) throw new Error('Signature parameter contains non-ASCII characters');
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Serialize @signature-params.
 * components: array of component identifiers, e.g. ['"@authority"', '"@path"'].
 */
function serializeParams(components, params) {
  const order = ['created', 'expires', 'keyid', 'alg', 'nonce', 'tag'];
  const parts = order
    .filter((k) => params[k] !== undefined)
    .map((k) => (typeof params[k] === 'number' ? `${k}=${params[k]}` : `${k}=${sfString(params[k])}`));
  return `(${components.join(' ')});${parts.join(';')}`;
}

/**
 * Build the signature base (RFC 9421 section 2.5).
 * values: map of component identifier -> value, in the order they are covered.
 */
function signatureBase(values, serializedParams) {
  const lines = Object.entries(values).map(([id, v]) => {
    if (/[\r\n]/.test(String(v))) throw new Error('Component value contains a newline');
    return `${id}: ${v}`;
  });
  lines.push(`"@signature-params": ${serializedParams}`);
  return lines.join('\n');
}

function clampTtl(ttlSeconds) {
  const ttl = Number.isFinite(ttlSeconds) ? Math.floor(ttlSeconds) : DEFAULT_TTL_SECONDS;
  if (ttl <= 0) return DEFAULT_TTL_SECONDS;
  return Math.min(ttl, MAX_TTL_SECONDS);
}

module.exports = {
  TAGS,
  MAX_TTL_SECONDS,
  DEFAULT_TTL_SECONDS,
  b64url,
  jwkThumbprint,
  serializeParams,
  signatureBase,
  sfString,
  clampTtl,
};
