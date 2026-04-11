/**
 * Business verification login routes.
 */
const { Router } = require('express');
const {
    handleSendOtp,
    handleVerifyOtp,
} = require('../controllers/businessVerificationController');

const router = Router();

router.post('/send-otp', handleSendOtp);
router.post('/verify-otp', handleVerifyOtp);

module.exports = router;
