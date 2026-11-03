/**
 * Agent signing key protection: the signer choke point, Cloud KMS client,
 * key directory, env tripwire, log redaction, secret scanner.
 *
 * No test here uses a real key. Keys are generated per run, in memory.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const signing = require('../../src/services/agentSigning');
const { createGcpKmsSigner, derToRaw } = require('../../src/services/agentSigning/gcpKmsSigner');
const { crc32c } = require('../../src/services/agentSigning/crc32c');
const { jwkThumbprint, MAX_TTL_SECONDS } = require('../../src/services/agentSigning/httpSignature');
const { scanEnvForKeyMaterial, hostAllowed } = require('../../src/services/agentSigning/guard');
const { verifySignature, checkDirectory } = require('../../src/services/agentSigning/verify');
const { captureOidcToken, getOidcToken } = require('../../src/services/agentSigning/oidcToken');
const { redact, redactInfo } = require('../../src/utils/redact');
const { scanText, scanFiles } = require('../../scripts/scan-secrets');

const ENV_KEYS = [
  'VERCEL_ENV', 'AGENT_SIGNING_BACKEND', 'AGENT_SIGNING_KMS_KEY_VERSION', 'AGENT_SIGNING_KMS_PUBLISHED_VERSIONS',
  'GCP_WIF_AUDIENCE', 'GCP_WIF_SERVICE_ACCOUNT', 'AGENT_SIGNING_DISABLED', 'AGENT_SIGNING_ALLOWED_HOSTS',
  'AGENT_SIGNING_MAX_PER_MINUTE', 'AGENT_TAP_KEYID', 'AGENT_SIGN_BRIDGE_REQUESTS', 'AGENT_SIGNING_PRIVATE_JWK',
  'SOME_UNRELATED_KEY', 'VERCEL_OIDC_TOKEN',
];
const saved = {};
beforeAll(() => { ENV_KEYS.forEach((k) => { saved[k] = process.env[k]; }); });
afterEach(() => {
  ENV_KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
  signing._reset();
});

// Built by concatenation so this file does not trip the secret scanner.
const PEM_HEAD = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');

describe('httpSignature', () => {
  test('JWK thumbprint matches the RFC 8037 Ed25519 vector', () => {
    expect(jwkThumbprint({ crv: 'Ed25519', kty: 'OKP', x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo' }))
      .toBe('kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k');
  });

  test('crc32c matches the standard check value', () => {
    expect(crc32c(Buffer.from('123456789')).toString(16)).toBe('e3069283');
  });
});

describe('signHttpRequest (dev signer)', () => {
  async function devKeyJwk() {
    const dir = await signing.buildDirectory({ authority: 'www.muse.shopping' });
    return JSON.parse(dir.body).keys[0];
  }

  test('Web Bot Auth request verifies, covers signature-agent, and is short-lived', async () => {
    const h = await signing.signHttpRequest({ url: 'https://www.allbirds.com/.well-known/ucp', tag: 'web-bot-auth' });
    const jwk = await devKeyJwk();
    expect(h['Signature-Agent']).toBe('"https://www.muse.shopping"');
    const r = verifySignature({
      signatureInput: h['Signature-Input'],
      signature: h.Signature,
      values: { '"@authority"': 'www.allbirds.com', '"signature-agent"': h['Signature-Agent'] },
      jwk,
    });
    expect(r.ok).toBe(true);
    expect(r.params.tag).toBe('web-bot-auth');
    expect(r.params.alg).toBe('ed25519');
    expect(r.params.keyid).toBe(jwkThumbprint(jwk));
    expect(r.params.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(r.params.expires - r.params.created).toBeLessThanOrEqual(MAX_TTL_SECONDS);
  });

  test('TAP request covers @authority and @path, clamps TTL, and can use a Visa-assigned keyid', async () => {
    process.env.AGENT_TAP_KEYID = 'visa-assigned-123';
    const h = await signing.signHttpRequest({
      url: 'https://www.allbirds.com/products/x?utm=1', tag: 'agent-browser-auth', ttlSeconds: 99999, label: 'sig2',
    });
    const jwk = await devKeyJwk();
    const r = verifySignature({
      signatureInput: h['Signature-Input'],
      signature: h.Signature,
      label: 'sig2',
      values: { '"@authority"': 'www.allbirds.com', '"@path"': '/products/x' },
      jwk,
    });
    expect(r.ok).toBe(true);
    expect(r.params.keyid).toBe('visa-assigned-123');
    expect(r.params.expires - r.params.created).toBe(MAX_TTL_SECONDS);
    expect(h['Signature-Agent']).toBeUndefined();
  });

  test.each([
    ['unknown host', { url: 'https://evil.example/', tag: 'web-bot-auth' }, 'HOST_FORBIDDEN'],
    ['plain http', { url: 'http://www.allbirds.com/', tag: 'web-bot-auth' }, 'NOT_HTTPS'],
    ['credentials in URL', { url: 'https://u:p@www.allbirds.com/', tag: 'web-bot-auth' }, 'BAD_URL'],
    ['unknown tag', { url: 'https://www.allbirds.com/', tag: 'anything' }, 'TAG_FORBIDDEN'],
    ['directory tag from callers', { url: 'https://www.allbirds.com/', tag: 'http-message-signatures-directory' }, 'TAG_FORBIDDEN'],
    ['uncoverable component', { url: 'https://www.allbirds.com/', tag: 'web-bot-auth', components: ['cookie'] }, 'COMPONENT_FORBIDDEN'],
  ])('refuses %s', async (_name, args, code) => {
    await expect(signing.signHttpRequest(args)).rejects.toMatchObject({ code });
  });

  test('UCP request: covers method/authority/path/query/ucp-agent/body digest/idempotency-key and verifies', async () => {
    const body = '{"jsonrpc":"2.0","id":1,"method":"tools/call"}';
    const headers = { 'Content-Type': 'application/json', 'UCP-Agent': 'profile="https://www.muse.shopping/.well-known/ucp"', 'Idempotency-Key': 'abc-123' };
    const h = await signing.signUcpRequest({ url: 'https://agolde.myshopify.com/api/ucp/mcp?x=1', body, headers });
    const digest = `sha-256=:${crypto.createHash('sha256').update(body).digest('base64')}:`;
    expect(h['Content-Digest']).toBe(digest);
    const [jwk] = await signing.publicKeys();
    expect(jwk.d).toBeUndefined();
    const r = verifySignature({
      signatureInput: h['Signature-Input'],
      signature: h.Signature,
      values: {
        '"@method"': 'POST',
        '"@authority"': 'agolde.myshopify.com',
        '"@path"': '/api/ucp/mcp',
        '"@query"': '?x=1',
        '"ucp-agent"': headers['UCP-Agent'],
        '"content-digest"': digest,
        '"content-type"': 'application/json',
        '"idempotency-key"': 'abc-123',
        '"signature-agent"': h['Signature-Agent'],
      },
      jwk,
    });
    expect(r.ok).toBe(true);
    expect(r.components).toEqual(['"@method"', '"@authority"', '"@path"', '"@query"', '"ucp-agent"', '"content-digest"', '"content-type"', '"idempotency-key"', '"signature-agent"']);
    expect(r.params.keyid).toBe(jwk.kid);
  });

  test('UCP request without body or query covers only the required components', async () => {
    const h = await signing.signUcpRequest({ method: 'GET', url: 'https://www.allbirds.com/.well-known/ucp' });
    expect(h['Signature-Input']).toMatch(/^sig1=\("@method" "@authority" "@path" "signature-agent"\)/);
    expect(h['Content-Digest']).toBeUndefined();
  });

  test('a covered header that is not supplied is refused', async () => {
    await expect(signing.signHttpRequest({ url: 'https://www.allbirds.com/', tag: 'web-bot-auth', components: ['@authority', 'ucp-agent'] }))
      .rejects.toMatchObject({ code: 'MISSING_HEADER' });
  });

  test('extra hosts can be allowed explicitly, including wildcards', () => {
    expect(hostAllowed('api.visa.com', {})).toBe(false);
    expect(hostAllowed('api.visa.com', { AGENT_SIGNING_ALLOWED_HOSTS: '*.visa.com' })).toBe(true);
    expect(hostAllowed('visa.com.evil.io', { AGENT_SIGNING_ALLOWED_HOSTS: '*.visa.com' })).toBe(false);
  });

  test('rate limit stops a signing flood', async () => {
    process.env.AGENT_SIGNING_MAX_PER_MINUTE = '2';
    const args = { url: 'https://www.allbirds.com/', tag: 'web-bot-auth' };
    await signing.signHttpRequest(args);
    await signing.signHttpRequest(args);
    await expect(signing.signHttpRequest(args)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  test('kill switch', async () => {
    process.env.AGENT_SIGNING_DISABLED = 'true';
    await expect(signing.signHttpRequest({ url: 'https://www.allbirds.com/', tag: 'web-bot-auth' }))
      .rejects.toMatchObject({ code: 'DISABLED' });
  });

  test('bridge headers are off by default, on for partners only, and never throw', async () => {
    expect(await signing.bridgeSignatureHeaders('https://www.allbirds.com/x')).toEqual({});
    process.env.AGENT_SIGN_BRIDGE_REQUESTS = 'true';
    const h = await signing.bridgeSignatureHeaders('https://www.allbirds.com/x');
    expect(h.Signature).toMatch(/^sig1=:/);
    expect(await signing.bridgeSignatureHeaders('https://not-a-partner.example/x')).toEqual({});
    process.env.AGENT_SIGNING_DISABLED = 'true';
    signing._reset();
    expect(await signing.bridgeSignatureHeaders('https://www.allbirds.com/x')).toEqual({});
  });
});

describe('production fails closed', () => {
  test('no KMS config means no signing, never a fallback key', async () => {
    process.env.VERCEL_ENV = 'production';
    await expect(signing.signHttpRequest({ url: 'https://www.allbirds.com/', tag: 'web-bot-auth' }))
      .rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  test('production refuses the dev backend even if asked', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.AGENT_SIGNING_BACKEND = 'local-dev';
    await expect(signing.signHttpRequest({ url: 'https://www.allbirds.com/', tag: 'web-bot-auth' }))
      .rejects.toMatchObject({ code: 'BACKEND_FORBIDDEN' });
  });

  test('a private key pasted into env disables signing in production', async () => {
    process.env.VERCEL_ENV = 'production';
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    process.env.AGENT_SIGNING_PRIVATE_JWK = JSON.stringify(privateKey.export({ format: 'jwk' }));
    await expect(signing.signHttpRequest({ url: 'https://www.allbirds.com/', tag: 'web-bot-auth' }))
      .rejects.toMatchObject({ code: 'KEY_IN_ENV' });
  });

  test('directory answers 503 (not a dev key) when production is not configured', async () => {
    process.env.VERCEL_ENV = 'production';
    const res = { set: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    await signing.directoryHandler({ hostname: 'www.muse.shopping', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.send).not.toHaveBeenCalled();
  });
});

describe('env tripwire', () => {
  test('finds Ed25519 keys under any name, agent-named JWKs and service accounts; reports names only', () => {
    const ed = crypto.generateKeyPairSync('ed25519').privateKey.export({ format: 'pem', type: 'pkcs8' });
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ format: 'pem', type: 'pkcs8' });
    const hits = scanEnvForKeyMaterial({
      SOME_UNRELATED_KEY: ed.replace(/\n/g, '\\n'),
      APPLE_SIGNIN_KEY: rsa, // unrelated RSA keys elsewhere in the app are not flagged
      UCP_SIGNING_PUBLIC_JWK: JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43), d: 'd'.repeat(43) }),
      KMS_SA: JSON.stringify({ type: 'service_account', private_key: `${PEM_HEAD}\nabc` }),
      TAP_PRIVATE_SEED: 'A'.repeat(43),
      AGENT_SIGNING_KMS_KEY_VERSION: 'projects/p/locations/us/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
    });
    expect(hits.sort()).toEqual(['KMS_SA', 'SOME_UNRELATED_KEY', 'TAP_PRIVATE_SEED', 'UCP_SIGNING_PUBLIC_JWK']);
  });
});

describe('Cloud KMS signer (mocked Google APIs)', () => {
  const VERSION = 'projects/p/locations/us/keyRings/muse-agent/cryptoKeys/muse-agent-ed25519/cryptoKeyVersions/1';
  const AUD = '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/vercel/providers/vercel-production';

  // Emulates STS + Cloud KMS with an in-memory Ed25519 key.
  function fakeGoogle({ tamper } = {}) {
    const pair = crypto.generateKeyPairSync('ed25519');
    const pem = pair.publicKey.export({ format: 'pem', type: 'spki' });
    const calls = [];
    const fetchImpl = jest.fn(async (url, init = {}) => {
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ url, body, auth: init.headers && init.headers.authorization });
      const ok = (json) => ({ ok: true, status: 200, json: async () => json });
      if (url.startsWith('https://sts.googleapis.com')) return ok({ access_token: 'fed-token', expires_in: 3600 });
      if (url.endsWith('/publicKey')) {
        return ok({ name: VERSION, pem, pemCrc32c: String(crc32c(Buffer.from(pem))), algorithm: 'EC_SIGN_ED25519' });
      }
      if (url.endsWith(':asymmetricSign')) {
        const real = crypto.sign(null, Buffer.from(body.data, 'base64'), pair.privateKey);
        const sig = tamper === 'sig' ? crypto.randomBytes(64) : real;
        return ok({
          name: tamper === 'name' ? VERSION.replace(/1$/, '2') : VERSION,
          signature: sig.toString('base64'),
          signatureCrc32c: String(crc32c(sig)),
          verifiedDataCrc32c: tamper !== 'crc',
        });
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    return { fetchImpl, calls, pair };
  }

  test('trades the OIDC token at STS, signs in KMS, verifies locally, caches the access token', async () => {
    const g = fakeGoogle();
    const signer = createGcpKmsSigner({ keyVersion: VERSION, wifAudience: AUD, getOidcToken: () => 'vercel-oidc', fetchImpl: g.fetchImpl });
    const msg = Buffer.from('hello');
    const sig = await signer.sign(msg);
    expect(crypto.verify(null, msg, g.pair.publicKey, sig)).toBe(true);
    await signer.sign(Buffer.from('again'));
    const sts = g.calls.filter((c) => c.url.startsWith('https://sts'));
    expect(sts).toHaveLength(1);
    expect(sts[0].body).toMatchObject({ audience: AUD, subjectToken: 'vercel-oidc' });
    const signCall = g.calls.find((c) => c.url.endsWith(':asymmetricSign'));
    expect(signCall.auth).toBe('Bearer fed-token');
    expect(signCall.body.dataCrc32c).toBe(String(crc32c(msg)));
    const { jwk, alg } = await signer.describe();
    expect(alg).toBe('ed25519');
    expect(jwk.d).toBeUndefined();
  });

  test('refuses tampered or mismatched KMS responses', async () => {
    for (const tamper of ['sig', 'name', 'crc']) {
      const g = fakeGoogle({ tamper });
      const signer = createGcpKmsSigner({ keyVersion: VERSION, wifAudience: AUD, getOidcToken: () => 't', fetchImpl: g.fetchImpl });
      await expect(signer.sign(Buffer.from('x'))).rejects.toThrow();
    }
  });

  test('no OIDC token (laptop, CI, preview without federation) means no signature', async () => {
    const g = fakeGoogle();
    const signer = createGcpKmsSigner({ keyVersion: VERSION, wifAudience: AUD, getOidcToken: () => undefined, fetchImpl: g.fetchImpl });
    await expect(signer.sign(Buffer.from('x'))).rejects.toThrow(/OIDC/);
    expect(g.fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects malformed resource names up front', () => {
    expect(() => createGcpKmsSigner({ keyVersion: 'projects/p', wifAudience: AUD, getOidcToken: () => 't' })).toThrow();
    expect(() => createGcpKmsSigner({ keyVersion: VERSION, wifAudience: 'aud', getOidcToken: () => 't' })).toThrow();
  });

  test('DER ECDSA signatures convert to raw r||s for P-256', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    for (let i = 0; i < 20; i += 1) {
      const msg = crypto.randomBytes(16);
      const der = crypto.sign('sha256', msg, { key: privateKey, dsaEncoding: 'der' });
      const raw = derToRaw(der);
      expect(raw).toHaveLength(64);
      expect(crypto.verify('sha256', msg, { key: publicKey, dsaEncoding: 'ieee-p1363' }, raw)).toBe(true);
    }
  });
});

describe('key directory', () => {
  test('publishes public keys only, signed by each key, and passes the outside-in check', async () => {
    const d = await signing.buildDirectory({ authority: 'www.muse.shopping' });
    expect(checkDirectory({ authority: 'www.muse.shopping', body: d.body, headers: d.headers })).toEqual([]);
    expect(d.body).not.toMatch(/"d"/);
  });

  test('will not sign for a Host header it does not own', async () => {
    await expect(signing.buildDirectory({ authority: 'evil.example' })).rejects.toMatchObject({ code: 'HOST_FORBIDDEN' });
  });

  test('the checker catches a directory that leaks a private member', () => {
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    const jwk = privateKey.export({ format: 'jwk' });
    const problems = checkDirectory({
      authority: 'www.muse.shopping',
      body: JSON.stringify({ keys: [jwk] }),
      headers: { 'content-type': 'application/http-message-signatures-directory+json' },
    });
    expect(problems.join(' ')).toMatch(/PRIVATE members: d/);
  });
});

describe('Vercel OIDC token handling', () => {
  test('middleware removes the token from the request but the signer can still read it', (done) => {
    delete process.env.VERCEL_OIDC_TOKEN;
    const req = { headers: { 'x-vercel-oidc-token': 'tok', host: 'x' }, rawHeaders: ['x-vercel-oidc-token', 'tok', 'host', 'x'] };
    captureOidcToken(req, {}, () => {
      expect(req.headers['x-vercel-oidc-token']).toBeUndefined();
      expect(req.rawHeaders).toEqual(['host', 'x']);
      setImmediate(() => {
        expect(getOidcToken()).toBe('tok');
        done();
      });
    });
  });
});

describe('log redaction', () => {
  test('redacts keys, tokens and signatures without touching the original object', () => {
    const jwt = ['eyJhbGciOiJSUzI1NiJ9', 'eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS90In0', 'c2lnbmF0dXJlc2lnbmF0dXJl'].join('.');
    const headers = { authorization: 'Bearer abcdefghijklmnopqrstuvwxyz', 'x-vercel-oidc-token': jwt, accept: 'json' };
    const input = {
      headers,
      note: `token ${jwt} and ${PEM_HEAD}\nMC4CAQAwBQYDK2VwBCIEI\n-----END PRIVATE KEY-----`,
      jwk: { kty: 'OKP', crv: 'Ed25519', x: 'pub', d: 'secret' },
      sigHeader: `sig1=:${'A'.repeat(86)}==:`,
      google: `ya29.${'a'.repeat(40)}`,
    };
    const out = redact(input);
    const s = JSON.stringify(out);
    expect(s).not.toMatch(/abcdefghij|MC4CAQAw|"secret"|AAAAAAAAAA|ya29\.a/);
    expect(s).not.toContain(jwt);
    expect(out.headers.accept).toBe('json');
    expect(out.jwk.x).toBe('pub');
    expect(headers.authorization).toBe('Bearer abcdefghijklmnopqrstuvwxyz');
  });

  test('winston format keeps level and redacts message text', () => {
    const info = { level: 'info', message: `got ${PEM_HEAD}\nabc\n-----END PRIVATE KEY-----`, accessToken: 'x' };
    const out = redactInfo(info);
    expect(out.level).toBe('info');
    expect(out.message).toBe('got [REDACTED PRIVATE KEY]');
    expect(out.accessToken).toBe('[REDACTED]');
  });
});

describe('secret scanner', () => {
  test('flags private keys, private JWKs, service accounts, cloud identity JWTs and env assignments', () => {
    const vercelJwt = [
      'eyJhbGciOiJSUzI1NiJ9',
      Buffer.from(JSON.stringify({ iss: 'https://oidc.vercel.com/team', sub: 'owner:t' })).toString('base64url'),
      'c2lnbmF0dXJlc2lnbmF0dXJlc2ln',
    ].join('.');
    const text = [
      PEM_HEAD,
      `VERCEL_OIDC_TOKEN="${vercelJwt}"`,
      `AGENT_SIGNING_PRIVATE_KEY=${'Q'.repeat(43)}`,
      '{"kty":"OKP","crv":"Ed25519","x":"abc",',
      ` "d":"${'z'.repeat(43)}"}`,
      `{"type": "service_account", "${'private'}_key": "x"}`, // secret-scan: allow test fixture
    ].join('\n');
    const rules = scanText('f.txt', text).map((f) => f.rule);
    expect(rules).toEqual(expect.arrayContaining([
      'PEM private key',
      'Cloud identity JWT (Vercel OIDC / Google)',
      'Agent private key in env assignment',
      'Private JWK (has "d")',
      'GCP service account key',
    ]));
  });

  test('ignores public JWKs, ordinary JWT-looking strings, and allow-marked lines', () => {
    const text = [
      '{"kty":"OKP","crv":"Ed25519","x":"11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"}',
      `${PEM_HEAD} secret-scan: allow docs example`,
    ].join('\n');
    expect(scanText('f.txt', text)).toEqual([]);
  });

  test('flags committed env and key files but not .env.example', () => {
    const rules = (f) => scanFiles([f], 'files').map((x) => x.rule);
    expect(rules('.env.vercel')).toContain('env file committed');
    expect(rules('config/muse.p8')).toContain('private key or key store file committed');
    expect(rules('.env.example')).toEqual([]);
  });
});

describe('isolation', () => {
  test('laptop jobs and scrapers never import the signer', () => {
    const roots = ['src/jobs', 'scripts'].map((r) => path.join(__dirname, '..', '..', r));
    const offenders = [];
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
        if (!/\.(c?js|ts)$/.test(e.name) || /check-agent-directory\.js$/.test(p)) continue;
        if (/agentSigning/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(process.cwd(), p));
      }
    };
    roots.forEach(walk);
    expect(offenders).toEqual([]);
  });
});
