/**
 * AES-256 Encryption Utility
 *
 * Handles encryption of PID blocks and session keys
 * for secure UIDAI Auth API communication.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits — recommended for GCM

/**
 * Generates a cryptographically secure random AES-256 session key.
 *
 * @returns {Buffer} 32-byte random session key.
 */
function generateSessionKey() {
    return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypts the PID XML block using AES-256-GCM.
 *
 * @param {string} pidXml     - Plain-text PID XML to encrypt.
 * @param {Buffer} sessionKey - 32-byte AES session key.
 * @returns {{ encryptedPid: string, iv: string, authTag: string }}
 *   All values are Base64-encoded strings.
 */
function encryptPidBlock(pidXml, sessionKey) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, sessionKey, iv);

    let encrypted = cipher.update(pidXml, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    return {
        encryptedPid: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
    };
}

/**
 * Decrypts an AES-256-GCM encrypted payload (for local testing only).
 *
 * @param {string} encryptedBase64 - Base64-encoded ciphertext.
 * @param {Buffer} sessionKey      - 32-byte AES session key.
 * @param {string} ivBase64        - Base64-encoded IV.
 * @param {string} authTagBase64   - Base64-encoded auth tag.
 * @returns {string} Decrypted plain text.
 */
function decryptPidBlock(encryptedBase64, sessionKey, ivBase64, authTagBase64) {
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, sessionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

/**
 * Encrypts the AES session key using UIDAI's RSA public key.
 * Uses RSA-OAEP with SHA-256 padding.
 *
 * @param {Buffer} sessionKey    - 32-byte AES session key.
 * @param {string} publicKeyPath - Absolute or relative path to UIDAI's PEM public key file.
 * @returns {string} Base64-encoded encrypted session key.
 */
function encryptSessionKey(sessionKey, publicKeyPath) {
    const resolvedPath = path.resolve(publicKeyPath);
    const publicKey = fs.readFileSync(resolvedPath, 'utf8');

    const encryptedKey = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        sessionKey,
    );

    return encryptedKey.toString('base64');
}

/**
 * Generates an HMAC-SHA-256 of the given data using the session key.
 *
 * @param {string} data       - Data to hash.
 * @param {Buffer} sessionKey - 32-byte AES session key.
 * @returns {string} Base64-encoded HMAC.
 */
function generateHmac(data, sessionKey) {
    const hmac = crypto.createHmac('sha256', sessionKey);
    hmac.update(data, 'utf8');
    return hmac.digest('base64');
}

/**
 * Hashes an Aadhaar number using SHA-256.
 * Used so that raw Aadhaar is never stored.
 *
 * @param {string} aadhaarNumber - 12-digit Aadhaar number.
 * @returns {string} Hex-encoded SHA-256 hash.
 */
function hashAadhaar(aadhaarNumber) {
    return crypto.createHash('sha256').update(aadhaarNumber).digest('hex');
}

module.exports = {
    generateSessionKey,
    encryptPidBlock,
    decryptPidBlock,
    encryptSessionKey,
    generateHmac,
    hashAadhaar,
};
