/**
 * UPI Analytics Routes
 */
const { Router } = require('express');
const {
    handleAnalyze,
    handleAnalyzeBySession,
} = require('../controllers/upiAnalyticsController');

const router = Router();

/**
 * POST /analytics/upi
 * Analyze UPI transactions from direct input.
 */
router.post('/analytics/upi', handleAnalyze);

/**
 * POST /analytics/upi/session
 * Fetch FI data by sessionId and run UPI analytics.
 */
router.post('/analytics/upi/session', handleAnalyzeBySession);

module.exports = router;
