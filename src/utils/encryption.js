/**
 * Encryption utilities for securing sensitive data
 * Used for encrypting OAuth tokens before storing in database
 */

const crypto = require('crypto');
require('dotenv').config();

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment
 * @returns {string} Encryption key
 * @throws {Error} If encryption key is not configured
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  return key;
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - Password/key to derive from
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Promise<Buffer>} Derived key
 */
function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha256', (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {Promise<string>} Encrypted data in format: salt:iv:tag:encrypted
 */
async function encrypt(text) {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  const encryptionKey = getEncryptionKey();

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from encryption key and salt
  const key = await deriveKey(encryptionKey, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Return concatenated: salt:iv:tag:encrypted
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt encrypted data
 * @param {string} encryptedData - Encrypted data in format: salt:iv:tag:encrypted
 * @returns {Promise<string>} Decrypted plain text
 */
async function decrypt(encryptedData) {
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }

  const encryptionKey = getEncryptionKey();

  // Split the encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltHex, ivHex, tagHex, encrypted] = parts;

  // Convert from hex to buffer
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  // Derive key from encryption key and salt
  const key = await deriveKey(encryptionKey, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt the text
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random encryption key
 * For use in setup/configuration
 * @returns {string} Random hex string suitable for ENCRYPTION_KEY
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify encryption configuration
 * @returns {boolean} True if encryption is properly configured
 * @throws {Error} If configuration is invalid
 */
function verifyEncryptionConfig() {
  try {
    getEncryptionKey();
    return true;
  } catch (error) {
    throw new Error(`Encryption configuration error: ${error.message}`);
  }
}

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  verifyEncryptionConfig,
};
