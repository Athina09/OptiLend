/**
 * AES-256-CBC encryption using Node.js crypto (no extra dependencies).
 *
 * - Key: 32 bytes from ENCRYPTION_KEY (64-char hex or base64 decoding to 32 bytes).
 * - IV: random 16 bytes per encrypt; store next to ciphertext (standard for CBC).
 *
 * Demo pitch: "Payloads are encrypted with AES-256 before persistence; each record
 * gets its own IV so identical inputs don't produce identical ciphertext."
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * @returns {Buffer}
 */
function loadKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || typeof raw !== 'string') {
    throw new Error(
      'ENCRYPTION_KEY is not set. Use 64 hex characters (32 bytes) or base64 encoding 32 bytes. Generate hex: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  const fromB64 = Buffer.from(trimmed, 'base64');
  if (fromB64.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (AES-256). Got ${fromB64.length} bytes after base64 decode.`
    );
  }
  return fromB64;
}

/**
 * @returns {boolean}
 */
function isEncryptionConfigured() {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} text UTF-8 plaintext
 * @returns {{ encryptedData: string, iv: string }} hex-encoded ciphertext and IV
 */
function encrypt(text) {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
  };
}

/**
 * @param {string} encryptedData hex
 * @param {string} ivHex hex
 * @returns {string} UTF-8 plaintext
 */
function decrypt(encryptedData, ivHex) {
  const key = loadKey();
  const iv = Buffer.from(ivHex, 'hex');
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length (expected 16 bytes).');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * @param {unknown} value JSON-serializable
 * @returns {{ encryptedData: string, iv: string }}
 */
function encryptJson(value) {
  return encrypt(JSON.stringify(value));
}

/**
 * @param {string} encryptedData hex
 * @param {string} ivHex hex
 * @returns {unknown}
 */
function decryptJson(encryptedData, ivHex) {
  return JSON.parse(decrypt(encryptedData, ivHex));
}

module.exports = {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  isEncryptionConfigured,
  ALGORITHM,
};
