/**
 * Muse agent signing: the ONE place in the codebase that can produce a
 * signature under Muse's agent identity (Web Bot Auth, Visa TAP, UCP).
 *
 * Rules (see docs/security/AGENT_SIGNING_KEY.md):
 *   - The production private key lives only in Google Cloud KMS. No code path
 *     accepts a private key from env, a file, or an argument.
 *   - Production signs through KMS via Vercel OIDC federation, or not at all.
 *     If KMS is not configured, signing fails closed; it never falls back.
 *   - Everything else (local, preview, laptop jobs) gets a throwaway in-memory
 *     key that nobody trusts.
 *   - Callers ask for a signed REQUEST, not raw bytes, so the guard can check
 *     the destination and purpose. There is intentionally no signBytes export.
 *
 * Bridges and TAP code should call signHttpRequest() and attach the returned
 * headers. Nothing else should import the signer modules directly.
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');
const { getOidcToken } = require('./oidcToken');
const { createGcpKmsSigner } = require('./gcpKmsSigner');
const { createLocalDevSigner } = require('./localDevSigner');
const {
  TAGS, b64url, jwkThumbprint, serializeParams, signatureBase, sfString, clampTtl,
} = require('./httpSignature');
const { scanEnvForKeyMaterial, hostAllowed, createRateLimiter } = require('./guard');

const DEFAULT_SIGNATURE_AGENT = 'https://www.muse.shopping';
const DIRECTORY_PATH = '/.well-known/http-message-signatures-directory';
const DIRECTORY_CONTENT_TYPE = 'application/http-message-signatures-directory+json';
const DIRECTORY_AUTHORITIES = new Set(['www.muse.shopping', 'muse.shopping']);
const ALLOWED_COMPONENTS = new Set([
  '@authority', '@path', '@method', '@target-uri', '@query',
  'signature-agent', 'content-digest', 'content-type', 'ucp-agent', 'idempotency-key',
]);
// Header components the caller supplies (signature-agent and content-digest are ours).
const CALLER_HEADERS = new Set(['content-type', 'ucp-agent', 'idempotency-key']);
const DEFAULT_COMPONENTS = {
  [TAGS.WEB_BOT_AUTH]: ['@authority', 'signature-agent'],
  [TAGS.TAP_BROWSE]: ['@authority', '@path'],
  [TAGS.TAP_PAY]: ['@authority', '@path'],
};

class AgentSigningError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AgentSigningError';
    this.code = code;
  }
}

let state = null; // { signers: [{signer, jwk, alg, keyid}], limiter }

function isProduction(env) {
  return env.VERCEL_ENV === 'production';
}

function selectBackend(env) {
  const requested = (env.AGENT_SIGNING_BACKEND || '').trim();
  if (isProduction(env)) {
    if (requested && requested !== 'gcp-kms') {
      throw new AgentSigningError('Production only signs through Cloud KMS', 'BACKEND_FORBIDDEN');
    }
    return 'gcp-kms';
  }
  if (requested === 'gcp-kms') return 'gcp-kms';
  return 'local-dev';
}

function checkTripwire(env) {
  const hits = scanEnvForKeyMaterial(env);
  if (!hits.length) return;
  // Names only. The values are exactly what we must not log.
  logger.error('agent_key_material_in_env', { vars: hits, action: isProduction(env) ? 'signing_disabled' : 'warning' });
  if (isProduction(env)) {
    throw new AgentSigningError(
      `Private key material found in env (${hits.join(', ')}). Signing is disabled until it is removed and the key is rotated.`,
      'KEY_IN_ENV',
    );
  }
}

async function describeSigner(signer) {
  const { jwk, alg } = await signer.describe();
  if (jwk.d !== undefined) throw new AgentSigningError('Signer exposed private key material', 'PRIVATE_IN_JWK');
  return { signer, jwk, alg, keyid: jwkThumbprint(jwk) };
}

async function init(env = process.env) {
  if (state) return state;
  if (String(env.AGENT_SIGNING_DISABLED || '').toLowerCase() === 'true') {
    throw new AgentSigningError('Agent signing is switched off (AGENT_SIGNING_DISABLED)', 'DISABLED');
  }
  checkTripwire(env);

  const backend = selectBackend(env);
  let signers;
  if (backend === 'gcp-kms') {
    const active = (env.AGENT_SIGNING_KMS_KEY_VERSION || '').trim();
    if (!active || !env.GCP_WIF_AUDIENCE) {
      throw new AgentSigningError('Cloud KMS signing is not configured (AGENT_SIGNING_KMS_KEY_VERSION, GCP_WIF_AUDIENCE)', 'NOT_CONFIGURED');
    }
    const extra = String(env.AGENT_SIGNING_KMS_PUBLISHED_VERSIONS || '')
      .split(',').map((s) => s.trim()).filter((s) => s && s !== active);
    const make = (keyVersion) => createGcpKmsSigner({
      keyVersion,
      wifAudience: env.GCP_WIF_AUDIENCE.trim(),
      serviceAccount: (env.GCP_WIF_SERVICE_ACCOUNT || '').trim() || undefined,
      getOidcToken,
    });
    signers = await Promise.all([active, ...extra].map((v) => describeSigner(make(v))));
  } else {
    signers = [await describeSigner(createLocalDevSigner({ env }))];
  }

  const perMinute = Math.max(1, Number(env.AGENT_SIGNING_MAX_PER_MINUTE) || 300);
  state = { backend, signers, limiter: createRateLimiter({ perMinute }), env };
  return state;
}

async function produce(entry, values, components, params, keyidOverride) {
  const fullParams = { ...params, keyid: keyidOverride || entry.keyid, alg: entry.alg };
  const serialized = serializeParams(components.map((c) => c.id), fullParams);
  const base = signatureBase(Object.fromEntries(components.map((c) => [c.id, values[c.name]])), serialized);
  const sig = await entry.signer.sign(Buffer.from(base, 'utf8'));
  return { serialized, signature: Buffer.from(sig).toString('base64') };
}

/**
 * Sign an outbound HTTP request as Muse's agent.
 * Returns headers to add: { 'Signature-Input', 'Signature', ['Signature-Agent'] }.
 */
async function signHttpRequest({
  method = 'GET', url, tag, ttlSeconds, components, label = 'sig1', signatureAgent, body, headers: reqHeaders = {},
} = {}) {
  const s = await init();
  if (![TAGS.WEB_BOT_AUTH, TAGS.TAP_BROWSE, TAGS.TAP_PAY].includes(tag)) {
    throw new AgentSigningError(`Tag not allowed: ${tag}`, 'TAG_FORBIDDEN');
  }
  let target;
  try { target = new URL(url); } catch (e) { throw new AgentSigningError('Invalid URL', 'BAD_URL'); }
  if (target.protocol !== 'https:') throw new AgentSigningError('Only https destinations are signed', 'NOT_HTTPS');
  if (target.username || target.password) throw new AgentSigningError('URLs with credentials are not signed', 'BAD_URL');
  if (!hostAllowed(target.hostname, s.env)) {
    logger.warn('agent_signature_refused', { reason: 'host_not_allowed', host: target.hostname, tag });
    throw new AgentSigningError(`Destination not on the agent allowlist: ${target.hostname}`, 'HOST_FORBIDDEN');
  }
  if (!/^[a-z][a-z0-9-]{0,15}$/.test(label)) throw new AgentSigningError('Bad signature label', 'BAD_LABEL');
  if (!s.limiter()) {
    logger.error('agent_signature_refused', { reason: 'rate_limited', tag });
    throw new AgentSigningError('Agent signing rate limit reached', 'RATE_LIMITED');
  }

  const names = components || DEFAULT_COMPONENTS[tag];
  for (const n of names) {
    if (!ALLOWED_COMPONENTS.has(n)) throw new AgentSigningError(`Component not allowed: ${n}`, 'COMPONENT_FORBIDDEN');
  }
  const agentValue = sfString(signatureAgent || s.env.AGENT_SIGNATURE_AGENT_URL || DEFAULT_SIGNATURE_AGENT);
  const values = {
    '@authority': target.host.toLowerCase(),
    '@path': target.pathname || '/',
    '@method': String(method).toUpperCase(),
    '@target-uri': target.href,
    '@query': target.search || '?',
    'signature-agent': agentValue,
  };
  const lowerHeaders = Object.fromEntries(Object.entries(reqHeaders || {}).map(([k, v]) => [k.toLowerCase(), v]));
  for (const n of names) {
    if (!CALLER_HEADERS.has(n)) continue;
    const v = lowerHeaders[n];
    if (v === undefined || v === null || String(v) === '') {
      throw new AgentSigningError(`Covered header missing: ${n}`, 'MISSING_HEADER');
    }
    values[n] = String(v).trim();
  }
  let contentDigest;
  if (names.includes('content-digest')) {
    if (body === undefined || body === null) throw new AgentSigningError('content-digest needs the raw body', 'MISSING_BODY');
    // Digest of the exact bytes sent; never re-serialize the body after signing.
    contentDigest = `sha-256=:${crypto.createHash('sha256').update(Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8')).digest('base64')}:`;
    values['content-digest'] = contentDigest;
  }
  const created = Math.floor(Date.now() / 1000);
  const params = {
    created,
    expires: created + clampTtl(ttlSeconds),
    nonce: b64url(crypto.randomBytes(32)),
    tag,
  };
  const entry = s.signers[0];
  const comps = names.map((n) => ({ name: n, id: `"${n}"` }));
  // Visa may assign its own keyid when it lists Muse; TAP signatures use it.
  const isTap = tag === TAGS.TAP_BROWSE || tag === TAGS.TAP_PAY;
  const keyid = (isTap && (s.env.AGENT_TAP_KEYID || '').trim()) || entry.keyid;
  const { serialized, signature } = await produce(entry, values, comps, params, keyid);

  // Audit trail: enough to reconcile against KMS audit logs and merchant
  // reports. Never the signature, never the query string.
  logger.info('agent_signature', {
    tag,
    host: values['@authority'],
    path_sha256: crypto.createHash('sha256').update(values['@path']).digest('hex').slice(0, 16),
    keyid,
    backend: s.backend,
    created: params.created,
    expires: params.expires,
    nonce: params.nonce,
  });

  const headers = {
    'Signature-Input': `${label}=${serialized}`,
    Signature: `${label}=:${signature}:`,
  };
  if (names.includes('signature-agent')) headers['Signature-Agent'] = agentValue;
  if (contentDigest) headers['Content-Digest'] = contentDigest;
  return headers;
}

/**
 * UCP request signature (ucp.dev signatures spec), in the Web Bot Auth shape so
 * one signature serves both: @method @authority @path, plus @query when there
 * is a query string, ucp-agent when that header is sent, content-digest and
 * content-type when there is a body, idempotency-key when given.
 * Pass the exact body bytes/string you will send and the headers you will send.
 */
async function signUcpRequest({ method = 'POST', url, body, headers = {}, ttlSeconds } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const components = ['@method', '@authority', '@path'];
  let hasQuery = false;
  try { hasQuery = Boolean(new URL(url).search); } catch (e) { /* signHttpRequest reports BAD_URL */ }
  if (hasQuery) components.push('@query');
  if (lower['ucp-agent']) components.push('ucp-agent');
  const hasBody = body !== undefined && body !== null && String(body).length > 0;
  if (hasBody) components.push('content-digest', 'content-type');
  if (lower['idempotency-key']) components.push('idempotency-key');
  components.push('signature-agent');
  return signHttpRequest({
    method, url, tag: TAGS.WEB_BOT_AUTH, ttlSeconds, components, body: hasBody ? body : undefined, headers,
  });
}

/** Public JWKs of every published key (active first), kid = RFC 7638 thumbprint. */
async function publicKeys() {
  const s = await init();
  return s.signers.map(({ jwk, keyid }) => {
    const { d, p, q, dp, dq, qi, ...pub } = jwk;
    return { ...pub, kid: keyid };
  });
}

// Bridge requests: Web Bot Auth headers, cached per host. The signature only
// covers @authority and Signature-Agent, so one signature per host is valid
// until it expires; caching keeps KMS calls (and latency) low.
const BRIDGE_TTL_SECONDS = 60;
const bridgeCache = new Map(); // host -> { headers, until }

/**
 * Headers to add to an outbound bridge request, or {} when bridge signing is
 * off (AGENT_SIGN_BRIDGE_REQUESTS != true), the host is not a partner, or
 * signing is unavailable. Never throws: an unsigned request is today's
 * behavior, and a signing outage must not take the bridges down.
 */
async function bridgeSignatureHeaders(url, env = process.env) {
  if (String(env.AGENT_SIGN_BRIDGE_REQUESTS || '').toLowerCase() !== 'true') return {};
  let host;
  let pathname;
  try { ({ pathname } = new URL(url)); host = new URL(url).host.toLowerCase(); } catch (e) { return {}; }
  // When UCP request signing is on, MCP calls are signed by signUcpRequest
  // (covers the body). Don't add a second signature to them here.
  if (String(env.AGENT_SIGN_UCP_REQUESTS || '').toLowerCase() === 'true' && /\/mcp\/?$/.test(pathname)) return {};
  if (!hostAllowed(new URL(url).hostname, env)) return {};
  const hit = bridgeCache.get(host);
  const nowS = Math.floor(Date.now() / 1000);
  if (hit && hit.until > nowS) return { ...hit.headers };
  try {
    const headers = await signHttpRequest({ url, tag: TAGS.WEB_BOT_AUTH, ttlSeconds: BRIDGE_TTL_SECONDS });
    bridgeCache.set(host, { headers, until: nowS + BRIDGE_TTL_SECONDS - 15 });
    return { ...headers };
  } catch (err) {
    logger.warn('agent_bridge_unsigned', { host, code: err.code || 'ERROR' });
    return {};
  }
}

/**
 * The Web Bot Auth key directory: public keys only, response signed by each
 * published key so a verifier knows the directory is ours.
 */
async function buildDirectory({ authority }) {
  const s = await init();
  const host = String(authority || '').toLowerCase();
  // The authority comes from the Host header, which a client controls. Only
  // sign for our own hostnames, or the directory becomes a signing oracle.
  if (!DIRECTORY_AUTHORITIES.has(host)) {
    throw new AgentSigningError('Directory is only served for muse.shopping', 'HOST_FORBIDDEN');
  }
  const keys = s.signers.map(({ jwk, keyid }) => {
    const { d, p, q, dp, dq, qi, ...pub } = jwk; // belt and braces
    return { ...pub, kid: keyid };
  });
  const created = Math.floor(Date.now() / 1000);
  const inputs = [];
  const sigs = [];
  for (let i = 0; i < s.signers.length; i += 1) {
    const params = { created, expires: created + 300, nonce: b64url(crypto.randomBytes(32)), tag: TAGS.DIRECTORY };
    const { serialized, signature } = await produce(
      s.signers[i],
      { authority: host },
      [{ name: 'authority', id: '"@authority";req' }],
      params,
    );
    inputs.push(`sig${i + 1}=${serialized}`);
    sigs.push(`sig${i + 1}=:${signature}:`);
  }
  return {
    body: JSON.stringify({ keys }),
    headers: {
      'Content-Type': DIRECTORY_CONTENT_TYPE,
      'Signature-Input': inputs.join(', '),
      Signature: sigs.join(', '),
      'Cache-Control': 'public, max-age=60',
    },
  };
}

/** Express handler for DIRECTORY_PATH. Fails closed with 503, never a dev key in prod. */
async function directoryHandler(req, res) {
  try {
    const { body, headers } = await buildDirectory({ authority: req.hostname || req.headers.host });
    res.set(headers).status(200).send(body);
  } catch (err) {
    const code = err.code || 'ERROR';
    logger.warn('agent_directory_unavailable', { code });
    res.status(code === 'HOST_FORBIDDEN' ? 404 : 503).json({ error: code });
  }
}

module.exports = {
  TAGS,
  DIRECTORY_PATH,
  DIRECTORY_CONTENT_TYPE,
  AgentSigningError,
  signHttpRequest,
  signUcpRequest,
  publicKeys,
  bridgeSignatureHeaders,
  buildDirectory,
  directoryHandler,
  _reset() { state = null; bridgeCache.clear(); },
};
