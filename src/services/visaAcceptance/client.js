/**
 * Visa Acceptance Platform (Cybersource) REST client, SANDBOX ONLY.
 *
 * This is the transport for Visa Intelligent Commerce Connect (ICC). It signs
 * each request with Cybersource HTTP Signature auth (REST shared secret):
 *   Signature: keyid="<key id>", algorithm="HmacSHA256",
 *              headers="host date request-target [digest] v-c-merchant-id",
 *              signature="<base64 HMAC-SHA256 over the signing string>"
 * The HMAC key is the base64-decoded shared secret.
 *
 * Env (set in Vercel Preview/Development only, never Production yet):
 *   VISA_ACCEPTANCE_ORG_ID   sandbox org ID, used as the merchant ID
 *   VISA_ACCEPTANCE_KEY_ID   REST shared-secret key ID from Business Center
 *   VISA_ACCEPTANCE_SECRET   REST shared secret (base64), never logged
 *
 * The host is pinned to the sandbox (apitest.cybersource.com). Production needs
 * a Muse LLC, a Visa API Agreement and an ICC slot; changing the host is a
 * deliberate code change, not an env flip.
 */

const crypto = require('crypto');

const SANDBOX_HOST = 'apitest.cybersource.com';
const DEFAULT_TIMEOUT_MS = 15000;

class VisaAcceptanceConfigError extends Error {}

function getConfig(env = process.env) {
  const merchantId = (env.VISA_ACCEPTANCE_ORG_ID || '').trim();
  const keyId = (env.VISA_ACCEPTANCE_KEY_ID || '').trim();
  const secret = (env.VISA_ACCEPTANCE_SECRET || '').trim();
  const missing = [];
  if (!merchantId) missing.push('VISA_ACCEPTANCE_ORG_ID');
  if (!keyId) missing.push('VISA_ACCEPTANCE_KEY_ID');
  if (!secret) missing.push('VISA_ACCEPTANCE_SECRET');
  return { merchantId, keyId, secret, missing, configured: missing.length === 0 };
}

function digestOf(body) {
  return `SHA-256=${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`;
}

/**
 * Build the auth headers for one request. Exported for tests.
 * @param {object} p { method, path, body (string|undefined), date (string), config }
 */
function buildAuthHeaders({ method, path, body, date, config }) {
  const lower = method.toLowerCase();
  const hasBody = lower === 'post' || lower === 'put' || lower === 'patch';
  const headers = {
    host: SANDBOX_HOST,
    date,
    'v-c-merchant-id': config.merchantId,
  };
  const signed = ['host', 'date', 'request-target'];
  const lines = [
    `host: ${SANDBOX_HOST}`,
    `date: ${date}`,
    `request-target: ${lower} ${path}`,
  ];
  if (hasBody) {
    headers.digest = digestOf(body || '');
    signed.push('digest');
    lines.push(`digest: ${headers.digest}`);
  }
  signed.push('v-c-merchant-id');
  lines.push(`v-c-merchant-id: ${config.merchantId}`);

  const key = Buffer.from(config.secret, 'base64');
  const signature = crypto.createHmac('sha256', key).update(lines.join('\n'), 'utf8').digest('base64');
  headers.signature = `keyid="${config.keyId}", algorithm="HmacSHA256", headers="${signed.join(' ')}", signature="${signature}"`;
  return { headers, signingString: lines.join('\n') };
}

async function request(method, path, payload, { env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const config = getConfig(env);
  if (!config.configured) {
    throw new VisaAcceptanceConfigError(`Missing env: ${config.missing.join(', ')}`);
  }
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const { headers } = buildAuthHeaders({
    method, path, body, date: new Date().toUTCString(), config,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://${SANDBOX_HOST}${path}`, {
      method: method.toUpperCase(),
      headers: { ...headers, 'Content-Type': 'application/json;charset=utf-8', Accept: 'application/hal+json;charset=utf-8' },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
    return { status: res.status, ok: res.ok, body: json, raw: json ? undefined : text.slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Smallest end-to-end proof that the keys work: a $1.00 sandbox authorization
 * with Visa's public test card (simulated data only, as the sandbox terms require).
 * Returns only non-sensitive fields.
 */
async function sandboxAuthCheck(opts = {}) {
  const res = await request('post', '/pts/v2/payments', {
    clientReferenceInformation: { code: `muse-sandbox-check-${Date.now()}` },
    processingInformation: { capture: false },
    paymentInformation: {
      card: { number: '4111111111111111', expirationMonth: '12', expirationYear: '2031' },
    },
    orderInformation: {
      amountDetails: { totalAmount: '1.00', currency: 'USD' },
      billTo: {
        firstName: 'Test', lastName: 'Shopper', address1: '1 Market St', locality: 'San Francisco',
        administrativeArea: 'CA', postalCode: '94105', country: 'US', email: 'test@example.com',
      },
    },
  }, opts);
  return {
    httpStatus: res.status,
    authenticated: res.status !== 401,
    status: res.body?.status || null,
    id: res.body?.id || null,
    reason: res.body?.errorInformation?.reason || res.body?.reason || res.body?.response?.rmsg || null,
    message: res.body?.errorInformation?.message || res.body?.message || null,
  };
}

module.exports = {
  SANDBOX_HOST,
  VisaAcceptanceConfigError,
  getConfig,
  buildAuthHeaders,
  request,
  sandboxAuthCheck,
};
