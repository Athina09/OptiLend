/**
 * Setu Aadhaar eKYC Service
 *
 * Integrates with Setu's Aadhaar OKYC bridge to send real OTPs
 * and verify them. This replaces the simulated direct UIDAI flow.
 */
const axios = require('axios');
const config = require('../config');
const store = require('../store/memoryStore');
const { hashAadhaar } = require('../utils/encryption');
const { generateToken } = require('../utils/jwtGenerator');

/**
 * Initiates real OTP via Setu Bridge.
 *
 * @param {string} aadhaarNumber - 12-digit Aadhaar.
 * @returns {Promise<Object>}
 */
async function initiateOtp(aadhaarNumber) {
    const hashed = hashAadhaar(aadhaarNumber);

    // Rate-limit check
    if (store.isLocked(hashed)) {
        const remaining = store.getLockoutRemaining(hashed);
        return {
            success: false,
            message: `Too many attempts. Locked for ${remaining}s.`,
        };
    }

    try {
        const response = await axios.post(
            `${config.gsp.kycBaseUrl}/`,
            {
                aadhaarNumber,
                redirectUrl: 'http://localhost:4000/auth/callback', // Placeholder
            },
            {
                headers: {
                    'x-client-id': config.gsp.apiKey,
                    'x-client-secret': config.gsp.apiSecret,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );

        const requestId = response.data?.id || response.data?.data?.id;

        if (!requestId) {
            throw new Error('Failed to get requestId from Setu.');
        }

        // Store Setu's requestId as the txnId in our session
        store.createSession(hashed, requestId);

        return {
            success: true,
            txnId: requestId,
            message: 'Real OTP has been sent to your Aadhaar-linked mobile via Setu.',
        };
    } catch (err) {
        console.error('[SetuAadhaarService] Initiate failed:', err.response?.data || err.message);

        // Fallback or detailed error from Setu
        const errorMessage = err.response?.data?.message || err.message;
        return {
            success: false,
            message: `Failed to initiate real OTP: ${errorMessage}`,
        };
    }
}

/**
 * Verifies real OTP via Setu Bridge.
 *
 * @param {string} aadhaarNumber
 * @param {string} otp
 * @param {string} txnId (requestId)
 * @returns {Promise<Object>}
 */
async function verifyOtp(aadhaarNumber, otp, txnId) {
    const hashed = hashAadhaar(aadhaarNumber);

    const session = store.getSession(hashed);
    if (!session || session.txnId !== txnId) {
        return { success: false, message: 'Invalid or expired session.' };
    }

    try {
        const response = await axios.post(
            `${config.gsp.kycBaseUrl}/${txnId}/verify`,
            { otp },
            {
                headers: {
                    'x-client-id': config.gsp.apiKey,
                    'x-client-secret': config.gsp.apiSecret,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );

        // Setu returns success if OTP is valid
        const isSuccess = response.status === 200;

        if (isSuccess) {
            // Generate our own JWT for the platform session
            const token = generateToken({ hashedAadhaar: hashed, txnId });
            store.clearSession(hashed);
            store.resetAttempts(hashed);

            return {
                success: true,
                token,
                message: 'Aadhaar verified successfully via Setu.',
                data: response.data?.data || response.data, // Contains eKYC metadata if available
            };
        } else {
            return handleFailure(hashed);
        }
    } catch (err) {
        console.error('[SetuAadhaarService] Verify failed:', err.response?.data || err.message);
        return handleFailure(hashed, err.response?.data?.message || err.message);
    }
}

function handleFailure(hashed, error) {
    const { locked, attemptsLeft } = store.incrementFailed(hashed);
    return {
        success: false,
        message: error || `Invalid OTP. ${attemptsLeft} attempts remaining.`,
    };
}

module.exports = {
    initiateOtp,
    verifyOtp,
};
