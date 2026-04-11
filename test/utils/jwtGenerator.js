/**
 * JWT Generator Utility
 *
 * Creates and verifies JSON Web Tokens for session management
 * after successful Aadhaar OTP authentication.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generates a signed JWT with a 30-minute default expiry.
 *
 * @param {Object} payload - Data to encode in the token.
 * @param {string} payload.hashedAadhaar - SHA-256 hash of the Aadhaar number.
 * @param {string} payload.txnId         - UIDAI transaction ID.
 * @returns {string} Signed JWT string.
 */
function generateToken(payload) {
    return jwt.sign(
        {
            sub: payload.hashedAadhaar,
            txn: payload.txnId,
            iat: Math.floor(Date.now() / 1000),
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiry },
    );
}

/**
 * Verifies and decodes a JWT.
 *
 * @param {string} token - JWT to verify.
 * @returns {{ valid: boolean, decoded?: Object, error?: string }}
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        return { valid: true, decoded };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

/**
 * Session JWT after business (GST / Udyam / PAN) verification.
 *
 * @param {{ businessId: string, idType: string, businessName: string }} payload
 */
function generateBusinessVerificationToken(payload) {
    return jwt.sign(
        {
            typ: 'business_verify',
            sub: `biz:${payload.businessId}`,
            businessId: payload.businessId,
            idType: payload.idType,
            businessName: payload.businessName,
            iat: Math.floor(Date.now() / 1000),
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiry },
    );
}

module.exports = {
    generateToken,
    verifyToken,
    generateBusinessVerificationToken,
};
