/**
 * Vercel OIDC token handling.
 *
 * On Vercel, every function invocation receives a short-lived OIDC token in the
 * `x-vercel-oidc-token` request header. Google Cloud trades it (Workload
 * Identity Federation) for a short-lived access token that may call Cloud KMS
 * `asymmetricSign` on Muse's agent key, and nothing else. This is what lets
 * production sign without any long-lived secret in env vars.
 *
 * Because that token can be exchanged for signing rights, it is treated like a
 * secret: we pull it off the request before any other middleware runs, so
 * request loggers, error handlers and proxies never see it.
 */

const { AsyncLocalStorage } = require('async_hooks');

const HEADER = 'x-vercel-oidc-token';
const store = new AsyncLocalStorage();

function stripFromRawHeaders(rawHeaders) {
  if (!Array.isArray(rawHeaders)) return rawHeaders;
  const out = [];
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (String(rawHeaders[i]).toLowerCase() !== HEADER) out.push(rawHeaders[i], rawHeaders[i + 1]);
  }
  return out;
}

/** Express middleware. Mount it first. */
function captureOidcToken(req, res, next) {
  const token = req.headers && req.headers[HEADER];
  if (req.headers) delete req.headers[HEADER];
  try {
    req.rawHeaders = stripFromRawHeaders(req.rawHeaders);
  } catch (e) {
    // rawHeaders is read-only on some runtimes; headers[] removal is what matters.
  }
  store.run({ token: typeof token === 'string' ? token : undefined }, next);
}

/** The current invocation's OIDC token, or undefined. Never log the result. */
function getOidcToken() {
  const fromStore = store.getStore();
  if (fromStore && fromStore.token) return fromStore.token;

  // Vercel's own request context, used by @vercel/oidc. Covers code paths that
  // run outside the Express middleware (cron handlers, other entry points).
  try {
    const ctx = globalThis[Symbol.for('@vercel/request-context')];
    const headers = ctx && typeof ctx.get === 'function' && ctx.get() && ctx.get().headers;
    if (headers && headers[HEADER]) return headers[HEADER];
  } catch (e) {
    // fall through
  }
  return process.env.VERCEL_OIDC_TOKEN || undefined;
}

module.exports = { HEADER, captureOidcToken, getOidcToken, _store: store };
