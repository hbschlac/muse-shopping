/**
 * DDL for shopper passkeys. Same as migrations/092_create_shopper_passkeys.sql.
 * Applied once per process on first use under an advisory lock.
 * Holds public keys only; private keys never leave the shopper's device.
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS shopper_passkeys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,   -- base64url, from the authenticator
  public_key BYTEA NOT NULL,            -- COSE public key
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  nickname VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_shopper_passkeys_user ON shopper_passkeys (user_id);

CREATE TABLE IF NOT EXISTS passkey_challenges (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  purpose VARCHAR(20) NOT NULL,         -- email (setup code), register, cart
  challenge TEXT NOT NULL,
  intent_id VARCHAR(64),                -- checkout intent a cart challenge is bound to
  summary_hash CHAR(64),                -- the review the shopper saw
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user ON passkey_challenges (user_id, purpose, expires_at);
ALTER TABLE passkey_challenges ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE passkey_challenges ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
`;

module.exports = { SCHEMA_SQL };
