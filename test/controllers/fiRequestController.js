/**
 * FI Request Controller
 *
 * Express route handlers for Account Aggregator FI data requests.
 */
const fiRequestService = require('../services/fiRequestService');

/**
 * POST /fi/request
 *
 * Initiates an FI data request to the Account Aggregator.
 *
 * Body:
 * {
 *   "consentId": "uuid-string",
 *   "maskedAccNumber": "XXXX-XXXX-1234",
 *   "fiType": "DEPOSIT",
 *   "from": "2025-01-01T00:00:00Z",
 *   "to": "2026-01-01T00:00:00Z"
 * }
 */
async function handleFiRequest(req, res) {
    try {
        const result = await fiRequestService.initiateFiRequest(req.body);
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[FIController] handleFiRequest error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

/**
 * GET /fi/session/:txnid
 *
 * Retrieves an FI request session by transaction ID.
 */
function handleGetSession(req, res) {
    try {
        const { txnid } = req.params;
        const session = fiRequestService.getFiSession(txnid);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'FI session not found.',
            });
        }

        return res.status(200).json({ success: true, data: session });
    } catch (err) {
        console.error('[FIController] handleGetSession error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

/**
 * GET /fi/sessions
 *
 * Lists all FI request sessions.
 */
function handleListSessions(req, res) {
    try {
        const sessions = fiRequestService.listFiSessions();
        return res.status(200).json({
            success: true,
            data: sessions,
            count: sessions.length,
        });
    } catch (err) {
        console.error('[FIController] handleListSessions error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

/**
 * GET /fi/fetch/:sessionId
 *
 * Fetches the FI data result using a sessionId.
 */
async function handleFetchData(req, res) {
    try {
        const { sessionId } = req.params;
        const result = await fiRequestService.fetchFiData(sessionId);
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[FIController] handleFetchData error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

module.exports = {
    handleFiRequest,
    handleGetSession,
    handleListSessions,
    handleFetchData,
};
