/**
 * Development and preview signer.
 *
 * Generates a throwaway Ed25519 key in memory when the process starts. It is
 * never written to disk, never read from env, and never registered with Visa,
 * Cloudflare or any merchant, so its signatures verify nowhere that matters.
 * It exists so the signing code path can be exercised locally and in preview
 * deployments without the production key ever leaving Cloud KMS.
 *
 * It refuses to run in Vercel production: production must sign through KMS or
 * not at all.
 */

const crypto = require('crypto');

function createLocalDevSigner({ env = process.env } = {}) {
  if (env.VERCEL_ENV === 'production') {
    throw new Error('The local dev signer is disabled in production. Configure Cloud KMS (see docs/security/AGENT_SIGNING_KEY.md).');
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const jwk = publicKey.export({ format: 'jwk' });

  return {
    backend: 'local-dev',
    keyVersion: 'ephemeral',
    async describe() {
      return { jwk, alg: 'ed25519', kmsAlgorithm: 'EC_SIGN_ED25519' };
    },
    async sign(bytes) {
      return crypto.sign(null, Buffer.from(bytes), privateKey);
    },
    // Deliberately no way to export the private key.
    toJSON() {
      return { backend: 'local-dev', jwk };
    },
  };
}

module.exports = { createLocalDevSigner };
