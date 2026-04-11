/**
 * JWS (JSON Web Signature) Signing Utility
 *
 * Creates Detached JWS signatures for AA FI request payloads
 * as required by the ReBIT AA API v2.0 specification.
 *
 * Detached JWS: The payload is removed from the JWS compact serialization,
 * resulting in header..signature (empty payload section in the token).
 * The recipient reconstructs the full JWS by reinserting the payload.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Base64url encode a string or buffer.
 *
 * @param {string|Buffer} data
 * @returns {string}
 */
function base64urlEncode(data) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    return buf
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Creates a Detached JWS signature for a given JSON payload.
 *
 * In Detached JWS the compact serialization is: header..signature
 * (the payload part between the two dots is empty).
 *
 * @param {Object|string} payload - The JSON payload to sign.
 * @param {Object} [options]
 * @param {string} [options.algorithm='RS256'] - Signing algorithm.
 * @param {string} [options.keyId] - Key ID for the JWS header.
 * @returns {{ detachedJws: string, fullJws: string }}
 *   detachedJws — for X-JWS-Signature header (header..signature)
 *   fullJws     — full JWS with payload (for debugging)
 */
function createDetachedJws(payload, options = {}) {
    const algorithm = options.algorithm || 'RS256';
    const keyId = options.keyId || config.aa.clientId || 'fiu-client-001';

    // 1. Build JWS header
    const header = {
        alg: algorithm,
        kid: keyId,
        b64: false,
        crit: ['b64'],
    };

    const encodedHeader = base64urlEncode(JSON.stringify(header));

    // 2. Encode payload
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const encodedPayload = base64urlEncode(payloadStr);

    // 3. Create signing input
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // 4. Sign with private key
    let signature;
    try {
        const privateKeyPath = path.resolve(config.aa.privateKeyPath);
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

        const nodeAlgorithm = algorithm === 'RS256' ? 'RSA-SHA256' : 'RSA-SHA256';
        const signer = crypto.createSign(nodeAlgorithm);
        signer.update(signingInput);
        signature = signer.sign(privateKey);
    } catch (err) {
        // Dev mode fallback: create an HMAC-based signature when no RSA key is available
        console.warn('[JWS] Private key not available, using dev-mode HMAC fallback:', err.message);
        const hmac = crypto.createHmac('sha256', config.jwt.secret);
        hmac.update(signingInput);
        signature = hmac.digest();
    }

    const encodedSignature = base64urlEncode(signature);

    // 5. Build JWS tokens
    const fullJws = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    const detachedJws = `${encodedHeader}..${encodedSignature}`; // payload removed

    return {
        detachedJws,
        fullJws,
    };
}

/**
 * Verifies a Detached JWS signature (for testing purposes).
 *
 * @param {string} detachedJws - The detached JWS (header..signature).
 * @param {Object|string} payload - The original payload.
 * @param {string} publicKeyPath - Path to the public key PEM file.
 * @returns {boolean} Whether the signature is valid.
 */
function verifyDetachedJws(detachedJws, payload, publicKeyPath) {
    try {
        const [encodedHeader, , encodedSignature] = detachedJws.split('.');
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const encodedPayload = base64urlEncode(payloadStr);

        const signingInput = `${encodedHeader}.${encodedPayload}`;
        const signature = Buffer.from(
            encodedSignature.replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
        );

        const publicKey = fs.readFileSync(path.resolve(publicKeyPath), 'utf8');
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(signingInput);
        return verifier.verify(publicKey, signature);
    } catch (err) {
        console.error('[JWS] Verification failed:', err.message);
        return false;
    }
}

module.exports = {
    createDetachedJws,
    verifyDetachedJws,
    base64urlEncode,
};
