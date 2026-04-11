/**
 * In-Memory Store
 *
 * Manages OTP sessions and failed-attempt tracking for rate limiting.
 * In production, replace this with Redis or a database-backed store.
 */

/** @type {Map<string, { txnId: string, createdAt: number }>} */
const sessions = new Map();

/** @type {Map<string, { count: number, lockedUntil: number | null }>} */
const attempts = new Map();

const config = require('../config');

// ─── Session Management ────────────────────────────────────────────

/**
 * Creates (or overwrites) an OTP session for a hashed Aadhaar.
 *
 * @param {string} hashedAadhaar - SHA-256 hash of the Aadhaar number.
 * @param {string} txnId        - UIDAI transaction ID.
 */
function createSession(hashedAadhaar, txnId) {
    sessions.set(hashedAadhaar, {
        txnId,
        createdAt: Date.now(),
    });
}

/**
 * Retrieves an existing OTP session.
 *
 * @param {string} hashedAadhaar
 * @returns {{ txnId: string, createdAt: number } | null}
 */
function getSession(hashedAadhaar) {
    return sessions.get(hashedAadhaar) || null;
}

/**
 * Removes an OTP session after successful verification.
 *
 * @param {string} hashedAadhaar
 */
function clearSession(hashedAadhaar) {
    sessions.delete(hashedAadhaar);
}

// ─── Rate Limiting ─────────────────────────────────────────────────

/**
 * Checks whether the account is currently locked.
 *
 * @param {string} hashedAadhaar
 * @returns {boolean}
 */
function isLocked(hashedAadhaar) {
    const record = attempts.get(hashedAadhaar);
    if (!record || !record.lockedUntil) return false;

    if (Date.now() < record.lockedUntil) {
        return true;
    }

    // Lock has expired — reset
    attempts.delete(hashedAadhaar);
    return false;
}

/**
 * Returns remaining lockout time in seconds (0 if not locked).
 *
 * @param {string} hashedAadhaar
 * @returns {number}
 */
function getLockoutRemaining(hashedAadhaar) {
    const record = attempts.get(hashedAadhaar);
    if (!record || !record.lockedUntil) return 0;

    const remaining = record.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Increments the failed-attempt counter.
 * Locks the account after reaching maxAttempts.
 *
 * @param {string} hashedAadhaar
 * @returns {{ locked: boolean, attemptsLeft: number }}
 */
function incrementFailed(hashedAadhaar) {
    let record = attempts.get(hashedAadhaar) || { count: 0, lockedUntil: null };
    record.count += 1;

    if (record.count >= config.rateLimit.maxAttempts) {
        record.lockedUntil = Date.now() + config.rateLimit.lockoutDurationMs;
        attempts.set(hashedAadhaar, record);
        return { locked: true, attemptsLeft: 0 };
    }

    attempts.set(hashedAadhaar, record);
    return {
        locked: false,
        attemptsLeft: config.rateLimit.maxAttempts - record.count,
    };
}

/**
 * Resets the failed-attempt counter (called on successful verification).
 *
 * @param {string} hashedAadhaar
 */
function resetAttempts(hashedAadhaar) {
    attempts.delete(hashedAadhaar);
}

module.exports = {
    createSession,
    getSession,
    clearSession,
    isLocked,
    getLockoutRemaining,
    incrementFailed,
    resetAttempts,
};
