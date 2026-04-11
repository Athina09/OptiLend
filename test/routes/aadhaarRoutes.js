/**
 * Aadhaar Authentication Routes
 *
 * Defines Express route mappings for the Aadhaar OTP auth flow.
 */
const { Router } = require('express');
const { handleInitiate, handleVerify } = require('../controllers/aadhaarController');

const router = Router();

/**
 * POST /auth/aadhaar/initiate
 * Initiates OTP-based Aadhaar authentication.
 * Body: { "aadhaarNumber": "123456789012" }
 */
router.post('/auth/aadhaar/initiate', handleInitiate);

/**
 * POST /auth/aadhaar/verify
 * Verifies the OTP and returns a JWT session token.
 * Body: { "aadhaarNumber": "123456789012", "otp": "123456", "txnId": "..." }
 */
router.post('/auth/aadhaar/verify', handleVerify);

module.exports = router;
