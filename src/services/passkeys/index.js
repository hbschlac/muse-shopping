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
 * Setting up Face ID needs a 6-digit code emailed to the shopper first, so a
 * stolen login alone can't add the thief's own passkey. Setup is refused if
 * email isn't configured (SMTP_HOST/SMTP_USER/SMTP_PASS). Each shopper gets
 * one passkey, an alert email when it's added, and every setup step is
 * written to the agent activity log.
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
const { ValidationError, ConflictError, RateLimitError, AppError } = require('../../utils/errors');
const { recordAgentEvent } = require('../agentAudit');
const logger = require('../../utils/logger');
const { SCHEMA_SQL } = require('./schema');

const RP_NAME = 'Muse';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODES_PER_WINDOW = 3;      // codes sent per shopper per 15 minutes
const EMAIL_CODE_MAX_ATTEMPTS = 5;     // wrong guesses before the code is burned
const CHALLENGES_PER_WINDOW = 30;      // Face ID prompts per shopper per 10 minutes
const SCHEMA_LOCK_KEY = 4172028;
const ALREADY_SET_UP = 'Face ID is already set up for Muse on another device.';

function rpId() {
  return process.env.WEBAUTHN_RP_ID || 'muse.shopping';
}
function origins() {
  return (process.env.WEBAUTHN_ORIGINS || 'https://www.muse.shopping,https://muse.shopping')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function hashCode(userId, code) {
  return crypto.createHash('sha256').update(`passkey-setup|${userId}|${code}`).digest('hex');
}

function sameHash(a, b) {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

/** Best effort: a log failure never blocks the shopper (checkout's own writes are required). */
async function logEvent(userId, action, decision, reason, details = {}) {
  try {
    await recordAgentEvent({ actor: 'shopper', action, decision, reason, userId, details });
  } catch (err) {
    logger.warn(`passkeys: could not log ${action}: ${err.message}`);
  }
}

async function shopperEmail(userId) {
  try {
    const row = (await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId])).rows[0];
    return row ? { email: row.email || null, name: row.full_name || 'there' } : { email: null, name: 'there' };
  } catch (err) {
    return { email: null, name: 'there' };
  }
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
  const recent = (await pool.query(
    `SELECT COUNT(*)::int AS n FROM passkey_challenges
      WHERE user_id = $1 AND purpose IN ('register', 'cart') AND created_at > NOW() - INTERVAL '10 minutes'`,
    [userId],
  )).rows[0];
  if (recent && recent.n >= CHALLENGES_PER_WINDOW) {
    await logEvent(userId, 'passkey.rate_limited', 'blocked', 'Too many Face ID prompts in 10 minutes', { purpose });
    throw new RateLimitError('Too many tries. Wait a few minutes and try again.', 600);
  }
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

/**
 * Step 1 of adding a passkey: email the shopper a 6-digit code. Only a hash
 * of the code is stored. Refused when email isn't configured, so setup never
 * silently skips the check.
 */
async function sendSetupCode(userId) {
  await ensureSchema();
  if (await hasPasskey(userId)) throw new ConflictError(ALREADY_SET_UP, ALREADY_SET_UP, ['Use the device you set up Face ID on']);
  if (!emailConfigured()) {
    await logEvent(userId, 'passkey.setup_refused', 'blocked', 'Email is not configured, so the setup code cannot be sent');
    throw new AppError('Face ID setup email is not configured', 503, 'EMAIL_NOT_CONFIGURED', true,
      'Face ID setup isn\'t available yet. Check out at each store for now.', [], true);
  }
  const recent = (await pool.query(
    `SELECT COUNT(*)::int AS n FROM passkey_challenges
      WHERE user_id = $1 AND purpose = 'email' AND created_at > NOW() - INTERVAL '15 minutes'`,
    [userId],
  )).rows[0];
  if (recent && recent.n >= EMAIL_CODES_PER_WINDOW) {
    await logEvent(userId, 'passkey.rate_limited', 'blocked', 'Too many setup codes in 15 minutes', { purpose: 'email' });
    throw new RateLimitError('We already sent you a few codes. Check your email or wait 15 minutes.', 900);
  }
  const { email, name } = await shopperEmail(userId);
  if (!email) throw new ValidationError('Add an email address to your account before setting up Face ID.');

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  // Old unused codes stop working once a new one is sent; the rows stay so the rate limit can count them.
  await pool.query(`UPDATE passkey_challenges SET expires_at = NOW() WHERE user_id = $1 AND purpose = 'email' AND expires_at > NOW()`, [userId]);
  await pool.query(
    `INSERT INTO passkey_challenges (user_id, purpose, challenge, expires_at)
     VALUES ($1, 'email', $2, $3)`,
    [userId, hashCode(userId, code), new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString()],
  );
  const emailService = require('../emailService');
  await emailService.sendTransactionalEmail(email, name, {
    subject: 'Your Muse Face ID setup code',
    heading: 'Set up Face ID for Muse checkout',
    body: `Your code is ${code}. It expires in 10 minutes.\n\nIf you didn't try to set up Face ID on Muse, don't share this code. Change your Muse password.`,
  });
  await logEvent(userId, 'passkey.setup_code_sent', 'info', 'Setup code emailed');
  return { sentTo: maskEmail(email), expiresInMinutes: 10 };
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return 'your email';
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`;
}

/** Check and burn the emailed code. Wrong guesses count; the 5th burns the code. */
async function checkSetupCode(userId, code) {
  const typed = String(code || '').replace(/\D/g, '');
  const row = (await pool.query(
    `SELECT id, challenge, attempts FROM passkey_challenges
      WHERE user_id = $1 AND purpose = 'email' AND expires_at > NOW()
      ORDER BY id DESC LIMIT 1`,
    [userId],
  )).rows[0];
  if (!row) throw new ValidationError('That code expired. Ask for a new one.');
  if (typed.length === 6 && sameHash(row.challenge, hashCode(userId, typed))) {
    await pool.query('UPDATE passkey_challenges SET expires_at = NOW() WHERE id = $1', [row.id]);
    await logEvent(userId, 'passkey.setup_code_ok', 'approved', 'Setup code matched');
    return true;
  }
  const attempts = Number(row.attempts) + 1;
  if (attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    await pool.query('UPDATE passkey_challenges SET attempts = $2, expires_at = NOW() WHERE id = $1', [row.id, attempts]);
  } else {
    await pool.query('UPDATE passkey_challenges SET attempts = $2 WHERE id = $1', [row.id, attempts]);
  }
  await logEvent(userId, 'passkey.setup_code_wrong', 'declined', `Wrong setup code (try ${attempts} of ${EMAIL_CODE_MAX_ATTEMPTS})`);
  throw new ValidationError(attempts >= EMAIL_CODE_MAX_ATTEMPTS
    ? 'Too many wrong codes. Ask for a new one.'
    : 'That code doesn\'t match. Check the email and try again.');
}

/** Step 2: with the emailed code, options for navigator.credentials.create(). */
async function registrationOptions(userId, { emailCode } = {}) {
  await ensureSchema();
  // One passkey per shopper for now. Adding another device without a tap on
  // the first would let anyone holding a stolen login add their own Face ID
  // and approve carts. Adding a second device comes later, approved by the first.
  const existing = await listPasskeys(userId);
  if (existing.length > 0) throw new ConflictError(ALREADY_SET_UP, ALREADY_SET_UP, ['Use the device you set up Face ID on']);
  await checkSetupCode(userId, emailCode);
  const { email } = await shopperEmail(userId); // the label in the passkey picker; not required
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

/** Step 3: verify the device's response, save the public key, and alert the shopper. */
async function verifyRegistration(userId, response, { nickname = null } = {}) {
  await ensureSchema();
  if (await hasPasskey(userId)) throw new ConflictError(ALREADY_SET_UP, ALREADY_SET_UP, ['Use the device you set up Face ID on']);
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
    logger.warn(`passkeys: registration rejected for user ${userId}: ${err.message}`);
    await logEvent(userId, 'passkey.setup_failed', 'declined', 'Device response did not verify');
    throw new ValidationError('Face ID setup didn\'t work. Try again.');
  }
  if (!result.verified || !result.registrationInfo) {
    await logEvent(userId, 'passkey.setup_failed', 'declined', 'Device response did not verify');
    throw new ValidationError('Face ID setup didn\'t work. Try again.');
  }
  const { credential } = result.registrationInfo;
  await pool.query(
    `INSERT INTO shopper_passkeys (user_id, credential_id, public_key, counter, transports, nickname)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (credential_id) DO NOTHING`,
    [userId, credential.id, Buffer.from(credential.publicKey), credential.counter || 0,
      credential.transports || response?.response?.transports || [], nickname],
  );
  await logEvent(userId, 'passkey.registered', 'approved', 'Face ID set up for Muse checkout', { nickname });
  await sendSetupAlert(userId);
  return { id: credential.id };
}

/** Tell the shopper Face ID was added, so an unexpected setup gets noticed. Never blocks setup. */
async function sendSetupAlert(userId) {
  try {
    const { email, name } = await shopperEmail(userId);
    if (!email || !emailConfigured()) return;
    const emailService = require('../emailService');
    await emailService.sendTransactionalEmail(email, name, {
      subject: 'Face ID was set up for Muse checkout',
      heading: 'Face ID is now on for Muse checkout',
      body: 'Face ID was just set up to approve carts on your Muse account.\n\nIf this wasn\'t you, change your Muse password and reply to this email so we can turn it off.',
    });
  } catch (err) {
    logger.warn(`passkeys: setup alert email failed for user ${userId}: ${err.message}`);
  }
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
    logger.warn(`passkeys: cart approval rejected for user ${userId}: ${err.message}`);
    throw new ValidationError('Face ID check failed. Nothing was charged.');
  }
  if (!result.verified) throw new ValidationError('Passkey check failed.');
  await pool.query(
    'UPDATE shopper_passkeys SET counter = $1, last_used_at = NOW() WHERE credential_id = $2',
    [result.authenticationInfo.newCounter, row.credential_id],
  );
  return { credentialId: row.credential_id, userVerified: result.authenticationInfo.userVerified };
}

module.exports = {
  sendSetupCode,
  listPasskeys,
  hasPasskey,
  registrationOptions,
  verifyRegistration,
  cartApprovalOptions,
  verifyCartApproval,
  ensureSchema,
  _internal: { rpId, origins, hashCode },
};
