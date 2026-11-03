/**
 * Production signer: Google Cloud KMS.
 *
 * The private key is generated inside Cloud KMS and cannot be exported, by
 * anyone, including hannah. Muse never holds it. To sign, a production
 * function:
 *
 *   1. takes its Vercel OIDC token (minted per invocation, short-lived),
 *   2. trades it at Google STS for a federated access token. The Workload
 *      Identity provider only accepts tokens whose subject is
 *      owner:<team>:project:<project>:environment:production, so preview
 *      deployments, laptops and CI cannot get one,
 *   3. calls cryptoKeyVersions.asymmetricSign. The IAM binding allows exactly
 *      that (roles/cloudkms.signerVerifier) on exactly one key.
 *
 * Every sign call is recorded in Cloud Audit Logs with the caller's identity,
 * which is how we detect signing from somewhere unexpected.
 *
 * No secrets live in env. The env vars below are identifiers, not credentials:
 *   AGENT_SIGNING_KMS_KEY_VERSION  projects/P/locations/L/keyRings/R/cryptoKeys/K/cryptoKeyVersions/N
 *   GCP_WIF_AUDIENCE               //iam.googleapis.com/projects/NUM/locations/global/workloadIdentityPools/POOL/providers/PROVIDER
 *   GCP_WIF_SERVICE_ACCOUNT        optional; only if direct federated access is not used
 */

const crypto = require('crypto');
const { crc32c } = require('./crc32c');

const KMS_BASE = 'https://cloudkms.googleapis.com/v1';
const STS_URL = 'https://sts.googleapis.com/v1/token';
const IAM_CREDS_BASE = 'https://iamcredentials.googleapis.com/v1';
const VERSION_RE = /^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+\/cryptoKeyVersions\/\d+$/;
const AUDIENCE_RE = /^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/;

// Access tokens are kept in memory for at most this long, even if Google
// issued them for an hour, to shrink the window a memory leak could use.
const MAX_ACCESS_TOKEN_CACHE_MS = 5 * 60 * 1000;

const ALGORITHMS = {
  EC_SIGN_ED25519: { httpSigAlg: 'ed25519', mode: 'data' },
  EC_SIGN_P256_SHA256: { httpSigAlg: 'ecdsa-p256-sha256', mode: 'digest' },
};

class KmsError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'KmsError';
    this.status = status;
  }
}

/** DER ECDSA signature -> fixed-width r||s, as RFC 9421 and JWS require. */
function derToRaw(der, size = 32) {
  let i = 0;
  if (der[i++] !== 0x30) throw new KmsError('Bad DER signature');
  if (der[i] & 0x80) i += 1 + (der[i] & 0x7f); else i += 1;
  const readInt = () => {
    if (der[i++] !== 0x02) throw new KmsError('Bad DER integer');
    const len = der[i++];
    let v = der.subarray(i, i + len);
    i += len;
    while (v.length > size && v[0] === 0) v = v.subarray(1);
    if (v.length > size) throw new KmsError('DER integer too long');
    return Buffer.concat([Buffer.alloc(size - v.length), v]);
  };
  return Buffer.concat([readInt(), readInt()]);
}

function createGcpKmsSigner({
  keyVersion,
  wifAudience,
  serviceAccount,
  getOidcToken,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
}) {
  if (!VERSION_RE.test(keyVersion || '')) {
    throw new KmsError('AGENT_SIGNING_KMS_KEY_VERSION must be a full cryptoKeyVersions resource name');
  }
  if (!AUDIENCE_RE.test(wifAudience || '')) {
    throw new KmsError('GCP_WIF_AUDIENCE must be a full workload identity provider resource name');
  }
  if (typeof getOidcToken !== 'function') throw new KmsError('getOidcToken is required');

  let cached = null; // { token, expiresAt, forOidc }
  let publicKeyInfo = null; // { keyObject, jwk, algorithm }

  async function call(url, init, what) {
    const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(5000) });
    let body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (!res.ok) {
      // Never echo request bodies or tokens into errors; status + reason only.
      const reason = body && body.error && (body.error.status || body.error.message);
      throw new KmsError(`${what} failed (${res.status}${reason ? `: ${String(reason).slice(0, 120)}` : ''})`, res.status);
    }
    return body;
  }

  async function accessToken() {
    const oidc = getOidcToken();
    if (!oidc) throw new KmsError('No Vercel OIDC token in this invocation; signing is only available in Vercel production');
    const oidcFingerprint = crypto.createHash('sha256').update(oidc).digest('hex').slice(0, 16);
    if (cached && cached.forOidc === oidcFingerprint && cached.expiresAt > now()) return cached.token;

    const sts = await call(STS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
        audience: wifAudience,
        scope: 'https://www.googleapis.com/auth/cloudkms',
        requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        subjectToken: oidc,
      }),
    }, 'STS token exchange');

    let token = sts.access_token;
    let ttlMs = (Number(sts.expires_in) || 300) * 1000;

    if (serviceAccount) {
      const imp = await call(`${IAM_CREDS_BASE}/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:generateAccessToken`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/cloudkms'], lifetime: '300s' }),
      }, 'Service account impersonation');
      token = imp.accessToken;
      ttlMs = 300 * 1000;
    }

    cached = {
      token,
      forOidc: oidcFingerprint,
      expiresAt: now() + Math.min(ttlMs - 60 * 1000, MAX_ACCESS_TOKEN_CACHE_MS),
    };
    return token;
  }

  async function loadPublicKey(version = keyVersion) {
    const token = await accessToken();
    const pk = await call(`${KMS_BASE}/${version}/publicKey`, {
      headers: { authorization: `Bearer ${token}` },
    }, 'KMS getPublicKey');
    if (pk.name && pk.name !== version) throw new KmsError('KMS returned a different key version than requested');
    if (pk.pemCrc32c !== undefined && String(crc32c(Buffer.from(pk.pem))) !== String(pk.pemCrc32c)) {
      throw new KmsError('Public key checksum mismatch');
    }
    const algo = ALGORITHMS[pk.algorithm];
    if (!algo) throw new KmsError(`Unsupported KMS algorithm ${pk.algorithm}`);
    const keyObject = crypto.createPublicKey(pk.pem);
    const jwk = keyObject.export({ format: 'jwk' });
    return { keyObject, jwk, algorithm: pk.algorithm, httpSigAlg: algo.httpSigAlg };
  }

  async function info() {
    if (!publicKeyInfo) publicKeyInfo = await loadPublicKey();
    return publicKeyInfo;
  }

  async function sign(bytes) {
    const data = Buffer.from(bytes);
    const { algorithm, keyObject } = await info();
    const algo = ALGORITHMS[algorithm];
    const token = await accessToken();

    let body;
    if (algo.mode === 'data') {
      body = { data: data.toString('base64'), dataCrc32c: String(crc32c(data)) };
    } else {
      const digest = crypto.createHash('sha256').update(data).digest();
      body = { digest: { sha256: digest.toString('base64') }, digestCrc32c: String(crc32c(digest)) };
    }

    const res = await call(`${KMS_BASE}/${keyVersion}:asymmetricSign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }, 'KMS asymmetricSign');

    if (res.name && res.name !== keyVersion) throw new KmsError('KMS signed with a different key version than requested');
    if (algo.mode === 'data' && res.verifiedDataCrc32c !== true) throw new KmsError('KMS did not confirm the data checksum');
    if (algo.mode === 'digest' && res.verifiedDigestCrc32c !== true) throw new KmsError('KMS did not confirm the digest checksum');
    const sig = Buffer.from(res.signature || '', 'base64');
    if (res.signatureCrc32c !== undefined && String(crc32c(sig)) !== String(res.signatureCrc32c)) {
      throw new KmsError('Signature checksum mismatch');
    }

    const raw = algo.mode === 'digest' ? derToRaw(sig) : sig;
    // Verify locally before anything leaves Muse: catches a misconfigured key
    // version or a tampered response.
    const ok = algorithm === 'EC_SIGN_ED25519'
      ? crypto.verify(null, data, keyObject, raw)
      : crypto.verify('sha256', data, { key: keyObject, dsaEncoding: 'ieee-p1363' }, raw);
    if (!ok) throw new KmsError('KMS signature failed local verification');
    return raw;
  }

  return {
    backend: 'gcp-kms',
    keyVersion,
    async describe() {
      const { jwk, httpSigAlg, algorithm } = await info();
      return { jwk, alg: httpSigAlg, kmsAlgorithm: algorithm };
    },
    /** Public JWK of another version (for publishing next/previous keys during rotation). */
    async publicJwkFor(version) {
      if (!VERSION_RE.test(version || '')) throw new KmsError('Invalid key version name');
      const { jwk, httpSigAlg } = await loadPublicKey(version);
      return { jwk, alg: httpSigAlg };
    },
    sign,
  };
}

module.exports = { createGcpKmsSigner, derToRaw, KmsError, ALGORITHMS };
