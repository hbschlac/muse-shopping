/**
 * Log redaction for anything that could stand in for Muse's agent identity:
 * private keys, the Vercel OIDC token, Google access tokens, bearer tokens and
 * signature values. Wired into both winston loggers, so a stray
 * logger.info(req.headers) or logger.error(err) with an axios config attached
 * cannot write a credential to Vercel's logs.
 *
 * It is a safety net, not the design: the production key never enters this
 * process at all (it stays in Cloud KMS).
 */

const SENSITIVE_KEY_RE = /^(authorization|proxy-authorization|cookie|set-cookie|x-vercel-oidc-token|x-vercel-trusted-oidc-idp-token|access_?token|refresh_?token|id_?token|subject_?token|private_?key|privatekey|client_?secret|signature|password|secret)$/i;

const PATTERNS = [
  [/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]'],
  [/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[^"'\n]*/g, '[REDACTED PRIVATE KEY]'],
  [/\bya29\.[0-9A-Za-z_-]{20,}/g, '[REDACTED GOOGLE TOKEN]'],
  [/\beyJ[0-9A-Za-z_-]{8,}\.eyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}/g, '[REDACTED JWT]'],
  [/\b(Bearer)\s+[0-9A-Za-z._~+/-]{16,}=*/gi, '$1 [REDACTED]'],
  [/("d"\s*:\s*")[0-9A-Za-z_-]{20,}(")/g, '$1[REDACTED]$2'],
  [/\b(sig[0-9a-z-]*=):[0-9A-Za-z+/=]{40,}:/g, '$1:[REDACTED]:'],
];

function redactString(s) {
  let out = s;
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out;
}

function redactValue(value, seen, depth) {
  if (typeof value === 'string') return redactString(value);
  if (!value || typeof value !== 'object') return value;
  if (depth > 8) return '[Truncated]';
  if (seen.has(value)) return '[Circular]';
  if (Buffer.isBuffer(value) || value instanceof Date) return value;
  seen.add(value);

  // Copy, never mutate: callers often log live objects (req.headers, an axios
  // config) that the app keeps using after the log line.
  let out;
  if (Array.isArray(value)) {
    out = value.map((v) => redactValue(v, seen, depth + 1));
  } else {
    out = {};
    if (value instanceof Error) {
      out.name = value.name;
      out.message = redactString(String(value.message));
      if (value.stack) out.stack = redactString(String(value.stack));
    }
    const isPrivateJwk = typeof value.kty === 'string' && typeof value.d === 'string';
    for (const key of Object.keys(value)) {
      let v;
      try { v = value[key]; } catch (e) { continue; }
      if (SENSITIVE_KEY_RE.test(key) || (isPrivateJwk && ['d', 'p', 'q', 'dp', 'dq', 'qi'].includes(key))) {
        out[key] = v === undefined || v === null || v === '' ? v : '[REDACTED]';
      } else {
        out[key] = redactValue(v, seen, depth + 1);
      }
    }
  }
  seen.delete(value);
  return out;
}

/** Return a redacted copy. Inputs are never modified. */
function redact(value) {
  return redactValue(value, new WeakSet(), 0);
}

/**
 * Winston format. Redacts the info object's own string keys (message, meta)
 * and keeps winston's Symbol keys (level, message, splat) intact.
 */
function redactInfo(info) {
  for (const key of Object.keys(info)) {
    if (key === 'level') continue;
    if (SENSITIVE_KEY_RE.test(key)) {
      if (info[key]) info[key] = '[REDACTED]';
    } else {
      info[key] = redactValue(info[key], new WeakSet(), 1);
    }
  }
  return info;
}

module.exports = { redact, redactInfo, redactString, SENSITIVE_KEY_RE };
