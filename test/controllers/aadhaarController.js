/**
 * Aadhaar Authentication Controller
 *
 * Express route handlers for OTP initiation and verification.
 */
const aadhaarService = require('../services/aadhaarService');

/**
 * POST /auth/aadhaar/initiate
 *
 * Accepts a 12-digit Aadhaar number and triggers OTP delivery.
 *
 * Request body:
 *   { "aadhaarNumber": "123456789012" }
 *
 * Response:
 *   { "success": true, "txnId": "uuid-v4", "message": "..." }
 */
async function handleInitiate(req, res) {
    try {
        const { aadhaarNumber, demoPhone } = req.body;

        if (!aadhaarNumber) {
            return res.status(400).json({
                success: false,
                message: 'aadhaarNumber is required in the request body.',
            });
        }

        const result = await aadhaarService.initiateOtp(aadhaarNumber, demoPhone);

        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[AadhaarController] handleInitiate error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
        });
    }
}

/**
 * POST /auth/aadhaar/verify
 *
 * Verifies the OTP entered by the user and returns a JWT on success.
 *
 * Request body:
 *   { "aadhaarNumber": "123456789012", "otp": "123456", "txnId": "uuid" }
 *
 * Response (success):
 *   { "success": true, "token": "jwt...", "message": "..." }
 *
 * Response (failure):
 *   { "success": false, "message": "Invalid OTP. 2 attempt(s) remaining..." }
 */
async function handleVerify(req, res) {
    try {
        const { aadhaarNumber, otp, txnId } = req.body;

        if (!aadhaarNumber || !otp || !txnId) {
            return res.status(400).json({
                success: false,
                message: 'aadhaarNumber, otp, and txnId are all required.',
            });
        }

        const result = await aadhaarService.verifyOtp(aadhaarNumber, otp, txnId);

        const statusCode = result.success ? 200 : result.message.includes('locked') ? 429 : 401;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[AadhaarController] handleVerify error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
        });
    }
}

module.exports = {
    handleInitiate,
    handleVerify,
};
