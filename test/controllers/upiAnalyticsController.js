/**
 * UPI Analytics Controller
 *
 * Express handlers for UPI-based transaction analytics.
 */
const upiAnalyticsService = require('../services/upiAnalyticsService');

/**
 * POST /analytics/upi
 *
 * Analyzes UPI transactions from direct input.
 *
 * Body:
 * {
 *   "transactions": [
 *     { "mode": "UPI", "type": "CREDIT", "amount": 5000, "date": "2025-12-01", "narration": "Salary" },
 *     ...
 *   ]
 * }
 */
async function handleAnalyze(req, res) {
    try {
        const { transactions } = req.body;

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({
                success: false,
                message: 'transactions array is required in the request body.',
            });
        }

        const result = upiAnalyticsService.analyzeFromTransactions(transactions);
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[UPIAnalyticsController] handleAnalyze error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

/**
 * POST /analytics/upi/session
 *
 * Fetches FI data by sessionId and runs UPI analytics.
 *
 * Body: { "sessionId": "..." }
 */
async function handleAnalyzeBySession(req, res) {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required in the request body.',
            });
        }

        const result = await upiAnalyticsService.analyzeFromSession(sessionId);
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[UPIAnalyticsController] handleAnalyzeBySession error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

module.exports = {
    handleAnalyze,
    handleAnalyzeBySession,
};
