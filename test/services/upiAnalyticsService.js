/**
 * UPI Analytics Service
 *
 * Bridges the FI fetch pipeline and the UPI analytics engine.
 * Can analyze transactions from:
 *  - Direct input (array of transactions)
 *  - A sessionId (fetches FI data first, then analyzes)
 */
const { analyzeUpi } = require('../utils/upiAnalytics');
const fiFetchService = require('./fiFetchService');

/**
 * Analyzes UPI transactions from a direct transaction array.
 *
 * @param {Object[]} transactions
 * @returns {Object}
 */
function analyzeFromTransactions(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return {
            success: false,
            message: 'transactions must be a non-empty array.',
        };
    }

    const analytics = analyzeUpi(transactions);

    return {
        success: true,
        message: `UPI analytics generated: ${analytics.transactionCount} UPI transactions found.`,
        data: analytics,
    };
}

/**
 * Fetches FI data by sessionId, then runs UPI analytics on the result.
 *
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
async function analyzeFromSession(sessionId) {
    if (!sessionId) {
        return { success: false, message: 'sessionId is required.' };
    }

    const fetchResult = await fiFetchService.fetchFiData(sessionId);
    if (!fetchResult.success) return fetchResult;

    // Extract the parsed transactions from the fetch result
    const analysis = fetchResult.data?.analysis;
    const allTxns = [
        ...(analysis?.credits || []),
        ...(analysis?.debits || []),
    ];

    if (allTxns.length === 0) {
        return {
            success: true,
            message: 'No transactions found in session data.',
            data: analyzeUpi([]),
        };
    }

    const upiAnalytics = analyzeUpi(allTxns);

    return {
        success: true,
        message: `UPI analytics for session ${sessionId}: ${upiAnalytics.transactionCount} UPI transactions.`,
        data: upiAnalytics,
    };
}

module.exports = {
    analyzeFromTransactions,
    analyzeFromSession,
};
