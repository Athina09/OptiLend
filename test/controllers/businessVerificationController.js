/**
 * Business verification login — GSTIN / Udyam / PAN + mock OTP.
 */
const businessVerificationService = require('../services/businessVerificationService');

async function handleSendOtp(req, res) {
    try {
        const { business_id: businessId } = req.body;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'business_id is required in the request body.',
            });
        }
        const result = businessVerificationService.sendOtp(businessId);
        const status = result.success ? 200 : 400;
        return res.status(status).json(result);
    } catch (err) {
        console.error('[BusinessVerification] send-otp:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

async function handleVerifyOtp(req, res) {
    try {
        const { business_id: businessId, otp } = req.body;
        if (!businessId || otp === undefined || otp === '') {
            return res.status(400).json({
                success: false,
                message: 'business_id and otp are required.',
            });
        }
        const result = businessVerificationService.verifyOtp(businessId, otp);
        if (!result.success) {
            const m = result.message || '';
            const code =
                m.includes('No active OTP') || m.includes('Business ID') || m.includes('GSTIN')
                    ? 400
                    : 401;
            return res.status(code).json(result);
        }
        return res.status(200).json(result);
    } catch (err) {
        console.error('[BusinessVerification] verify-otp:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

module.exports = {
    handleSendOtp,
    handleVerifyOtp,
};
