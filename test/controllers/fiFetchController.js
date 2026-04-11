/**
 * FI Fetch Controller
 *
 * Express route handlers for fetching and parsing
 * financial data from Account Aggregator.
 */
const fiFetchService = require('../services/fiFetchService');

/**
 * POST /fi/fetch
 *
 * Fetches encrypted FI data, decrypts it, and returns parsed transactions.
 *
 * Body:
 * {
 *   "sessionId": "session-id-from-fi-request",
 *   "fipId": "FIP-001"         // optional
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "txnid": "...",
 *     "sessionId": "...",
 *     "analysis": {
 *       "totalInflow": 57000,
 *       "totalOutflow": 21100,
 *       "netFlow": 35900,
 *       "creditCount": 4,
 *       "debitCount": 6,
 *       "credits": [...],
 *       "debits": [...]
 *     }
 *   }
 * }
 */
async function handleFiFetch(req, res) {
    try {
        const { sessionId, fipId, linkRefNumbers } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required in the request body.',
            });
        }

        const result = await fiFetchService.fetchFiData(sessionId, {
            fipId,
            linkRefNumbers,
        });

        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[FIFetchController] handleFiFetch error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

module.exports = {
    handleFiFetch,
};
