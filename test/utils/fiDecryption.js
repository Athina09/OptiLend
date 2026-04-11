/**
 * AES Decryption Utility for AA FI Data
 *
 * Decrypts AES-256-GCM encrypted financial information payloads
 * received from Account Aggregator FI/fetch responses.
 *
 * The AA encrypts FI data using AES-256-GCM with a shared session key
 * derived via ECDH key exchange during the FI/request phase.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;    // 96 bits for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag

/**
 * Decrypts AES-256-GCM encrypted Base64 data.
 *
 * The encrypted payload format (Base64-decoded):
 *   [IV (12 bytes)] + [ciphertext] + [auth tag (16 bytes)]
 *
 * @param {string} encryptedBase64 - Base64-encoded encrypted data.
 * @param {Buffer|string} sessionKey - 32-byte AES session key (Buffer or hex string).
 * @returns {{ success: boolean, data?: string, error?: string }}
 */
function decryptFiData(encryptedBase64, sessionKey) {
    try {
        const key = typeof sessionKey === 'string'
            ? Buffer.from(sessionKey, 'hex')
            : sessionKey;

        if (key.length !== 32) {
            return { success: false, error: `Invalid key length: expected 32 bytes, got ${key.length}` };
        }

        const encrypted = Buffer.from(encryptedBase64, 'base64');

        if (encrypted.length < IV_LENGTH + TAG_LENGTH + 1) {
            return { success: false, error: 'Encrypted data too short to contain IV + tag + ciphertext.' };
        }

        // Extract components
        const iv = encrypted.subarray(0, IV_LENGTH);
        const authTag = encrypted.subarray(encrypted.length - TAG_LENGTH);
        const ciphertext = encrypted.subarray(IV_LENGTH, encrypted.length - TAG_LENGTH);

        // Decrypt
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return { success: true, data: decrypted.toString('utf8') };
    } catch (err) {
        return { success: false, error: `Decryption failed: ${err.message}` };
    }
}

/**
 * Decrypts with separate IV and auth tag parameters.
 * Used when the AA response provides these values separately.
 *
 * @param {string} ciphertextBase64 - Base64 ciphertext only.
 * @param {Buffer|string} sessionKey - 32-byte AES key.
 * @param {string} ivBase64 - Base64 IV.
 * @param {string} authTagBase64 - Base64 auth tag.
 * @returns {{ success: boolean, data?: string, error?: string }}
 */
function decryptFiDataSeparate(ciphertextBase64, sessionKey, ivBase64, authTagBase64) {
    try {
        const key = typeof sessionKey === 'string'
            ? Buffer.from(sessionKey, 'hex')
            : sessionKey;

        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
        const ciphertext = Buffer.from(ciphertextBase64, 'base64');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return { success: true, data: decrypted.toString('utf8') };
    } catch (err) {
        return { success: false, error: `Decryption failed: ${err.message}` };
    }
}

/**
 * Encrypts test data for development/testing purposes.
 * Creates the same format that the AA would produce.
 *
 * @param {string} plaintext - Data to encrypt.
 * @param {Buffer} sessionKey - 32-byte AES key.
 * @returns {string} Base64-encoded [IV + ciphertext + auth tag].
 */
function encryptTestData(plaintext, sessionKey) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, sessionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: IV + ciphertext + auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return combined.toString('base64');
}

module.exports = {
    decryptFiData,
    decryptFiDataSeparate,
    encryptTestData,
};
