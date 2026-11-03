/**
 * Verifier for Muse's own signatures. Used by tests and by the weekly
 * directory watch (scripts/check-agent-directory.js) to prove, from the
 * outside, that what www.muse.shopping publishes is public-only and that each
 * key really signs.
 */

const crypto = require('crypto');
const { jwkThumbprint } = require('./httpSignature');

const PRIVATE_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k', 'oth'];

/** Split a structured-field dictionary on top-level commas (not inside quotes or parens). */
function splitDict(header) {
  const out = {};
  let depth = 0; let inStr = false; let start = 0;
  const s = String(header || '');
  for (let i = 0; i <= s.length; i += 1) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') inStr = !inStr;
    if (!inStr && c === '(') depth += 1;
    if (!inStr && c === ')') depth -= 1;
    if (i === s.length || (c === ',' && !inStr && depth === 0)) {
      const part = s.slice(start, i).trim();
      if (part) {
        const eq = part.indexOf('=');
        out[part.slice(0, eq)] = part.slice(eq + 1);
      }
      start = i + 1;
    }
  }
  return out;
}

function parseParams(serialized) {
  const close = serialized.indexOf(')');
  const inner = serialized.slice(1, close);
  const components = inner.match(/"[^"]+"(;[a-z]+)?/g) || [];
  const params = {};
  serialized.slice(close + 1).split(';').filter(Boolean).forEach((kv) => {
    const eq = kv.indexOf('=');
    const k = kv.slice(0, eq);
    let v = kv.slice(eq + 1);
    v = v.startsWith('"') ? v.slice(1, -1).replace(/\\(["\\])/g, '$1') : Number(v);
    params[k] = v;
  });
  return { components, params };
}

function verifyWithJwk(jwk, alg, data, signature) {
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  if (alg === 'ed25519') return crypto.verify(null, data, key, signature);
  if (alg === 'ecdsa-p256-sha256') return crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, signature);
  return false;
}

/**
 * Verify a signature given component values.
 * values: map of component id (as it appears in Signature-Input) -> value.
 */
function verifySignature({ signatureInput, signature, label = 'sig1', values, jwk, nowS = Math.floor(Date.now() / 1000) }) {
  const inputs = splitDict(signatureInput);
  const sigs = splitDict(signature);
  if (!inputs[label] || !sigs[label]) return { ok: false, reason: `missing ${label}` };
  const { components, params } = parseParams(inputs[label]);
  const lines = components.map((id) => `${id}: ${values[id]}`);
  lines.push(`"@signature-params": ${inputs[label]}`);
  const sigBytes = Buffer.from(sigs[label].replace(/^:|:$/g, ''), 'base64');
  if (!(params.expires > nowS)) return { ok: false, reason: 'expired', params };
  if (params.created > nowS + 60) return { ok: false, reason: 'created in the future', params };
  const ok = verifyWithJwk(jwk, params.alg, Buffer.from(lines.join('\n')), sigBytes);
  return { ok, reason: ok ? null : 'bad signature', params, components };
}

/** Check a fetched directory response. Returns a list of problems (empty = healthy). */
function checkDirectory({ authority, body, headers, nowS = Math.floor(Date.now() / 1000), maxKeys = 3 }) {
  const problems = [];
  const h = (name) => headers[name] || headers[name.toLowerCase()];
  if (!/application\/http-message-signatures-directory\+json/.test(String(h('Content-Type') || ''))) {
    problems.push('wrong content type');
  }
  let doc;
  try { doc = JSON.parse(body); } catch (e) { return ['body is not JSON']; }
  const keys = Array.isArray(doc.keys) ? doc.keys : [];
  if (!keys.length) problems.push('no keys published');
  if (keys.length > maxKeys) problems.push(`too many keys published (${keys.length}); retire old ones`);

  const inputs = splitDict(h('Signature-Input'));
  keys.forEach((jwk, i) => {
    const leaked = PRIVATE_MEMBERS.filter((m) => jwk[m] !== undefined);
    if (leaked.length) problems.push(`key ${i} publishes PRIVATE members: ${leaked.join(',')}`);
    let thumb;
    try { thumb = jwkThumbprint(jwk); } catch (e) { problems.push(`key ${i} is not a valid JWK`); return; }
    if (jwk.kid && jwk.kid !== thumb) problems.push(`key ${i} kid does not match its thumbprint`);
    const label = Object.keys(inputs).find((l) => parseParams(inputs[l]).params.keyid === thumb);
    if (!label) { problems.push(`key ${i} did not sign the directory`); return; }
    const r = verifySignature({
      signatureInput: h('Signature-Input'),
      signature: h('Signature'),
      label,
      values: { '"@authority";req': authority },
      jwk,
      nowS,
    });
    if (!r.ok) problems.push(`key ${i} directory signature: ${r.reason}`);
    else if (r.params.tag !== 'http-message-signatures-directory') problems.push(`key ${i} signed with wrong tag`);
    else if (r.params.expires - r.params.created > 600) problems.push(`key ${i} directory signature lives too long`);
  });
  return problems;
}

module.exports = { splitDict, parseParams, verifySignature, checkDirectory, PRIVATE_MEMBERS };
