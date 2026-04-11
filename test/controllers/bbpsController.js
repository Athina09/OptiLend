/**
 * BBPS Utility Payment Controller
 *
 * Express handler for fetching utility bill payment history
 * and computing reliability scores.
 */
const bbpsService = require('../services/bbpsService');

/**
 * POST /utility/bbps/fetch
 *
 * Fetches utility bill payment history and returns reliability analysis.
 *
 * Body:
 * {
 *   "mobileNumber": "9876543210",       // OR "customerId": "CUST-001"
 *   "categories": ["ELECTRICITY", "WATER", "BROADBAND"]  // optional, defaults to all
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "summary": {
 *       "totalBills": 36,
 *       "onTimePayments": 24,
 *       "delayedPayments": 9,
 *       "unpaidBills": 3,
 *       "paymentSuccessRate": 0.6667,
 *       "reliabilityScore": 66.67
 *     },
 *     "categoryBreakdown": { ... },
 *     "bills": [ ... ]
 *   }
 * }
 */
async function handleFetchBills(req, res) {
    try {
        const { mobileNumber, customerId, categories } = req.body;

        if (!mobileNumber && !customerId) {
            return res.status(400).json({
                success: false,
                message: 'Either mobileNumber or customerId is required.',
            });
        }

        const result = await bbpsService.fetchBillHistory({
            mobileNumber,
            customerId,
            categories,
        });

        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[BBPSController] handleFetchBills error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

module.exports = {
    handleFetchBills,
};
