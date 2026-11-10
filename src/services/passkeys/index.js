/**
 * Shopper passkeys (WebAuthn): Face ID / Touch ID / a security key, used to
 * approve a cart before Muse's agent pays any store.
 *
 * Muse stores only each passkey's public key, id and signature counter. The
 * private key never leaves the shopper's device. No card data lives here.
 *
 * A cart approval challenge is bound to one checkout intent and the exact
 * review the shopper saw (its summaryHash), is single-use, and expires in
 * 5 minutes, so an assertion for one cart can't approve another.
 *
 * Config: WEBAUTHN_RP_ID (default muse.shopping) and WEBAUTHN_ORIGINS
 * (comma-separated, default https://www.muse.shopping,https://muse.shopping).
 */

const crypto = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const pool = require('../../db/pool');
const { ValidationError } = require('../../utils/errors');
const { SCHEMA_SQL } = require('./schema');

const RP_NAME = 'Muse';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SCHEMA_LOCK_KEY = 4172028;

function rpId() {
  return process.env.WEBAUTHN_RP_ID || 'muse.shopping';
}
function origins() {
  return (process.env.WEBAUTHN_ORIGINS || 'https://www.muse.shopping,https://muse.shopping')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

let schemaReady = null;
async function applySchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEMA_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = applySchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function listPasskeys(userId) {
  await ensureSchema();
  const { rows } = await pool.query(
    'SELECT credential_id, transports, nickname, created_at, last_used_at FROM shopper_passkeys WHERE user_id = $1 ORDER BY created_at',
    [userId],
  );
  return rows.map((r) => ({
    id: r.credential_id, transports: r.transports || [], nickname: r.nickname,
    createdAt: r.created_at, lastUsedAt: r.last_used_at,
  }));
}

async function hasPasskey(userId) {
  await ensureSchema();
  const { rows } = await pool.query('SELECT 1 FROM shopper_passkeys WHERE user_id = $1 LIMIT 1', [userId]);
  return rows.length > 0;
}

async function saveChallenge(userId, purpose, challenge, intentId = null, summaryHash = null) {
  await pool.query(
    `INSERT INTO passkey_challenges (user_id, purpose, challenge, intent_id, summary_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, purpose, challenge, intentId, summaryHash, new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()],
  );
}

/** Take (and burn) the newest unexpired challenge for this purpose. */
async function takeChallenge(userId, purpose, intentId = null) {
  const { rows } = await pool.query(
    `DELETE FROM passkey_challenges
      WHERE id = (SELECT id FROM passkey_challenges
                   WHERE user_id = $1 AND purpose = $2 AND intent_id IS NOT DISTINCT FROM $3 AND expires_at > NOW()
                   ORDER BY id DESC LIMIT 1)
      RETURNING challenge, summary_hash`,
    [userId, purpose, intentId],
  );
  return rows[0] || null;
}

/** Step 1 of adding a passkey: options for navigator.credentials.create(). */
async function registrationOptions(userId) {
  await ensureSchema();
  let email = null;
  try {
    email = (await pool.query('SELECT email FROM users WHERE id = $1', [userId])).rows[0]?.email || null;
  } catch (err) {
    email = null; // the label in the passkey picker; not required
  }
  const existing = await listPasskeys(userId);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId(),
    userName: email || `shopper-${userId}`,
    userID: new TextEncoder().encode(String(userId)),
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
  });
  await saveChallenge(userId, 'register', options.challenge);
  return options;
}

/** Step 2: verify the device's response and save the public key. */
async function verifyRegistration(userId, response, { nickname = null } = {}) {
  await ensureSchema();
  const saved = await takeChallenge(userId, 'register');
  if (!saved) throw new ValidationError('Passkey setup timed out. Try again.');
  let result;
  try {
    result = await verifyRegistrationResponse({
      response,
      expectedChallenge: saved.challenge,
      expectedOrigin: origins(),
      expectedRPID: rpId(),
      requireUserVerification: true,
    });
  } catch (err) {
    throw new ValidationError(`Passkey setup failed: ${err.message}`);
  }
  if (!result.verified || !result.registrationInfo) throw new ValidationError('Passkey setup failed.');
  const { credential } = result.registrationInfo;
  await pool.query(
    `INSERT INTO shopper_passkeys (user_id, credential_id, public_key, counter, transports, nickname)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (credential_id) DO NOTHING`,
    [userId, credential.id, Buffer.from(credential.publicKey), credential.counter || 0,
      credential.transports || response?.response?.transports || [], nickname],
  );
  return { id: credential.id };
}

/**
 * Options for navigator.credentials.get() to approve one cart. The challenge
 * is bound to this intent and summaryHash.
 */
async function cartApprovalOptions(userId, intentId, summaryHash) {
  await ensureSchema();
  const keys = await listPasskeys(userId);
  if (!keys.length) throw new ValidationError('Set up a passkey before confirming.');
  // Mix the cart into the random challenge so the signed bytes name this cart.
  const nonce = crypto.randomBytes(32);
  const bound = crypto.createHash('sha256').update(nonce).update(`${intentId}|${summaryHash}`).digest();
  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    challenge: bound,
    userVerification: 'required',
    allowCredentials: keys.map((p) => ({ id: p.id, transports: p.transports })),
  });
  await saveChallenge(userId, 'cart', options.challenge, intentId, summaryHash);
  return options;
}

/**
 * Verify the shopper's passkey tap for this cart. Throws unless it's valid,
 * fresh, made by one of this shopper's passkeys, and for this exact review.
 */
async function verifyCartApproval(userId, intentId, summaryHash, response) {
  await ensureSchema();
  const saved = await takeChallenge(userId, 'cart', intentId);
  if (!saved) throw new ValidationError('Passkey check timed out. Tap Confirm again.');
  if (saved.summary_hash !== summaryHash) throw new ValidationError('The cart changed since you reviewed it. Review it again.');
  const credId = response && response.id;
  const { rows } = await pool.query(
    'SELECT credential_id, public_key, counter, transports FROM shopper_passkeys WHERE user_id = $1 AND credential_id = $2',
    [userId, credId],
  );
  if (!rows.length) throw new ValidationError('That passkey isn\'t set up for your account.');
  const row = rows[0];
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: saved.challenge,
      expectedOrigin: origins(),
      expectedRPID: rpId(),
      requireUserVerification: true,
      credential: {
        id: row.credential_id,
        publicKey: new Uint8Array(row.public_key),
        counter: Number(row.counter),
        transports: row.transports || [],
      },
    });
  } catch (err) {
    throw new ValidationError(`Passkey check failed: ${err.message}`);
  }
  if (!result.verified) throw new ValidationError('Passkey check failed.');
  await pool.query(
    'UPDATE shopper_passkeys SET counter = $1, last_used_at = NOW() WHERE credential_id = $2',
    [result.authenticationInfo.newCounter, row.credential_id],
  );
  return { credentialId: row.credential_id, userVerified: result.authenticationInfo.userVerified };
}

module.exports = {
  listPasskeys,
  hasPasskey,
  registrationOptions,
  verifyRegistration,
  cartApprovalOptions,
  verifyCartApproval,
  ensureSchema,
  _internal: { rpId, origins },
};
