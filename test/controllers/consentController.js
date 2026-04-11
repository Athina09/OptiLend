/**
 * Consent Controller
 *
 * Express route handlers for Account Aggregator consent artefact management.
 */
const consentService = require('../services/consentService');

/**
 * POST /consent/create
 *
 * Creates a new consent artefact.
 *
 * Body:
 * {
 *   "userReferenceId": "user-123",
 *   "fiTypes": ["DEPOSIT", "UPI"],
 *   "dataRange": { "from": "2025-01-01T00:00:00Z", "to": "2026-01-01T00:00:00Z" },
 *   "dataLife": { "unit": "MONTH", "value": 6 }
 * }
 */
async function handleCreate(req, res) {
    try {
        const result = await consentService.createConsent(req.body);
        const statusCode = result.success ? 201 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[ConsentController] handleCreate error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

/**
 * GET /consent/:consentId
 *
 * Retrieves a consent artefact by its ID.
 */
async function handleGet(req, res) {
    try {
        const { consentId } = req.params;
        const result = await consentService.getConsent(consentId);
        const statusCode = result.success ? 200 : 404;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[ConsentController] handleGet error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

/**
 * GET /consent/user/:userReferenceId
 *
 * Retrieves all consent artefacts for a given user.
 */
async function handleGetByUser(req, res) {
    try {
        const { userReferenceId } = req.params;
        const result = await consentService.getUserConsents(userReferenceId);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[ConsentController] handleGetByUser error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

/**
 * POST /consent/:consentId/revoke
 *
 * Revokes an active consent artefact.
 */
async function handleRevoke(req, res) {
    try {
        const { consentId } = req.params;
        const result = await consentService.revokeConsent(consentId);
        const statusCode = result.success ? 200 : 404;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[ConsentController] handleRevoke error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

module.exports = {
    handleCreate,
    handleGet,
    handleGetByUser,
    handleRevoke,
};
