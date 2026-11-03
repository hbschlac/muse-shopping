/**
 * Guards around the signer.
 *
 * The key cannot be stolen from KMS, so the realistic abuse is getting Muse to
 * sign something it should not (a "signing oracle"). These checks limit what a
 * bug, an SSRF, or injected input can make Muse sign:
 *
 *   - destination allowlist: only hosts Muse actually talks to as an agent,
 *   - tag allowlist: only the purposes in httpSignature.TAGS,
 *   - rate limit per instance,
 *   - a tripwire that refuses to sign if private key material ever shows up in
 *     the environment (someone pasted the key into Vercel "to make it work").
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const AGENT_NAME_RE = /(AGENT|TAP|WEB_?BOT|UCP|SIGNATURE|SIGNING|KMS|WIF)/i;
const PEM_PRIVATE_RE = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;

function looksLikeJson(v) {
  const t = v.trim();
  return t.startsWith('{') && t.endsWith('}');
}

/**
 * Returns the NAMES (never values) of env vars that hold private key material
 * which could stand in for Muse's agent key, or a long-lived credential that
 * could call KMS. Any hit means the KMS-only design has been bypassed.
 */
function scanEnvForKeyMaterial(env = process.env) {
  const hits = [];
  for (const [name, raw] of Object.entries(env)) {
    if (typeof raw !== 'string' || raw.length < 32) continue;
    const value = raw.replace(/\\n/g, '\n');
    const agentNamed = AGENT_NAME_RE.test(name);

    if (PEM_PRIVATE_RE.test(value)) {
      if (agentNamed) { hits.push(name); continue; }
      // Any Ed25519 private key anywhere is suspicious: that is the agent key type.
      try {
        const k = crypto.createPrivateKey(value);
        if (k.asymmetricKeyType === 'ed25519') { hits.push(name); continue; }
      } catch (e) { /* not parseable; ignore */ }
    }

    if (looksLikeJson(value)) {
      try {
        const obj = JSON.parse(value);
        const keys = Array.isArray(obj.keys) ? obj.keys : [obj];
        if (keys.some((k) => k && typeof k === 'object' && typeof k.d === 'string' && (agentNamed || k.kty === 'OKP'))) {
          hits.push(name); continue;
        }
        if (agentNamed && obj.type === 'service_account' && obj.private_key) { hits.push(name); continue; }
      } catch (e) { /* not JSON */ }
    }

    // Raw 32-byte Ed25519 seeds in an agent-named PRIVATE/SECRET/SEED var.
    if (agentNamed && /(PRIVATE|SECRET|SEED)/i.test(name) && /^[A-Za-z0-9+/_=-]{43,44}$/.test(value.trim())) {
      hits.push(name);
    }
  }
  return hits;
}

let partnerHostsCache = null;
function partnerHosts() {
  if (partnerHostsCache) return partnerHostsCache;
  const hosts = new Set();
  try {
    const file = path.join(__dirname, '..', 'agentBridges', 'partners.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const p of data.partners || []) {
      if (p.domain) hosts.add(String(p.domain).toLowerCase());
      if (p.endpoint) {
        try { hosts.add(new URL(p.endpoint).hostname.toLowerCase()); } catch (e) { /* skip */ }
      }
    }
  } catch (e) {
    // No registry means only explicitly configured hosts are allowed.
  }
  partnerHostsCache = hosts;
  return hosts;
}

function configuredHosts(env = process.env) {
  return String(env.AGENT_SIGNING_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(hostname, env = process.env) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (host === 'muse.shopping' || host === 'www.muse.shopping') return true;
  if (partnerHosts().has(host)) return true;
  return configuredHosts(env).some((entry) => {
    if (entry.startsWith('*.')) return host.endsWith(entry.slice(1)) && host.length > entry.length - 1;
    return host === entry;
  });
}

function createRateLimiter({ perMinute, now = () => Date.now() }) {
  let windowStart = now();
  let count = 0;
  return function take() {
    const t = now();
    if (t - windowStart >= 60 * 1000) { windowStart = t; count = 0; }
    count += 1;
    return count <= perMinute;
  };
}

module.exports = {
  AGENT_NAME_RE,
  scanEnvForKeyMaterial,
  hostAllowed,
  createRateLimiter,
  _resetPartnerHosts() { partnerHostsCache = null; },
};
