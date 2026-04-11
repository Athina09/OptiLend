/**
 * GST Filing Controller
 *
 * Express handler for fetching GST filing history
 * and computing compliance scores via GSP APIs.
 */
const gspService = require('../services/gspService');
const mastersIndiaGstService = require('../services/mastersIndiaGstService');

/**
 * POST /gst/fetch
 *
 * Fetches GST filing history and returns compliance analysis.
 *
 * Body:
 * {
 *   "gstin": "29AALCT1234F1Z5",
 *   "returnTypes": ["GSTR-1", "GSTR-3B"]   // optional, defaults to both
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "summary": {
 *       "totalFilings": 24,
 *       "onTimeFilings": 17,
 *       "delayedFilings": 7,
 *       "complianceScore": 0.7083,
 *       "avgTurnover": 650000,
 *       "totalTaxPaid": 2808000
 *     },
 *     "returnTypeBreakdown": { ... },
 *     "filings": [ ... ]
 *   }
 * }
 */
async function handleFetchGst(req, res) {
    try {
        const { gstin, returnTypes, includeMastersIndia, masters_month: mastersMonth, masters_year: mastersYear } =
            req.body;

        if (!gstin) {
            return res.status(400).json({
                success: false,
                message: 'gstin is required in the request body.',
            });
        }

        const result = await gspService.fetchGstFilings(gstin, { returnTypes });

        if (
            result.success &&
            result.data &&
            includeMastersIndia &&
            (process.env.MASTERS_INDIA_JWT || process.env.MASTERS_INDIA_USERNAME)
        ) {
            try {
                const defaults = mastersIndiaGstService.getDefaultIndianGstPeriod();
                const mi = await mastersIndiaGstService.getGstrData({
                    gstin: String(gstin).toUpperCase().trim(),
                    month: mastersMonth ?? defaults.month,
                    year: mastersYear ?? defaults.year,
                    dataType: 'GSTR1',
                    pageSize: 10,
                });
                result.data.mastersIndia = mi;
            } catch (err) {
                result.data.mastersIndia = {
                    success: false,
                    message: err.message || 'Masters India call failed.',
                };
            }
        }

        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[GSTController] handleFetchGst error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}

module.exports = {
    handleFetchGst,
};
