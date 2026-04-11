/**
 * Proxies Masters India GST API (GSTIN + period + JWT).
 */
const mastersIndiaGstService = require('../services/mastersIndiaGstService');

/**
 * GET /gst/masters-india/data
 * Query: gstin (required), month, year, data_type (default GSTR1), page_size, search
 * If month/year omitted, uses previous calendar month + Indian FY.
 */
async function handleGetGstrData(req, res) {
    try {
        const {
            gstin,
            month: monthQ,
            year: yearQ,
            data_type: dataType,
            page_size: pageSize,
            search,
        } = req.query;

        if (!gstin) {
            return res.status(400).json({
                success: false,
                message: 'Query parameter gstin is required.',
            });
        }

        const defaults = mastersIndiaGstService.getDefaultIndianGstPeriod();
        const month = monthQ !== undefined && monthQ !== '' ? monthQ : defaults.month;
        const year = yearQ || defaults.year;

        const result = await mastersIndiaGstService.getGstrData({
            gstin: String(gstin).toUpperCase().trim(),
            month,
            year,
            dataType: dataType || 'GSTR1',
            pageSize: pageSize ? parseInt(pageSize, 10) : 10,
            search: search || '',
        });

        const code = result.success ? 200 : result.status && result.status >= 400 ? result.status : 502;
        return res.status(code).json(result);
    } catch (err) {
        console.error('[MastersIndiaGST] get data:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || 'Masters India request failed.',
        });
    }
}

/**
 * POST /gst/masters-india/upload-gstr3b
 * Body: { gstin, month, year, payload } — payload = full GSTR-3B JSON (sup_details, inter_sup, …)
 */
async function handleUploadGstr3b(req, res) {
    try {
        const { gstin, month, year, payload } = req.body;
        if (!gstin || month === undefined || !year || !payload || typeof payload !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Body must include gstin, month, year, and payload (object).',
            });
        }

        const result = await mastersIndiaGstService.uploadGstr3b({
            gstin: String(gstin).toUpperCase().trim(),
            month,
            year,
            payload,
        });

        const code = result.success ? 200 : result.status && result.status >= 400 ? result.status : 502;
        return res.status(code).json(result);
    } catch (err) {
        console.error('[MastersIndiaGST] upload gstr3b:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || 'Upload failed.',
        });
    }
}

/**
 * POST /gst/masters-india/upload-gstr1
 * Body: { gstin, month, year, payload, invoice?, summary? }
 */
async function handleUploadGstr1(req, res) {
    try {
        const { gstin, month, year, payload, invoice, summary } = req.body;
        if (!gstin || month === undefined || !year || !payload || typeof payload !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Body must include gstin, month, year, and payload (object).',
            });
        }

        const result = await mastersIndiaGstService.uploadGstr1({
            gstin: String(gstin).toUpperCase().trim(),
            month,
            year,
            payload,
            invoice: invoice !== undefined ? String(invoice) : 'Y',
            summary: summary !== undefined ? String(summary) : 'y',
        });

        const code = result.success ? 200 : result.status && result.status >= 400 ? result.status : 502;
        return res.status(code).json(result);
    } catch (err) {
        console.error('[MastersIndiaGST] upload gstr1:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || 'Upload failed.',
        });
    }
}

/**
 * GET /gst/masters-india/period-default — helper for UI (suggested month + FY)
 */
function handlePeriodDefault(req, res) {
    const p = mastersIndiaGstService.getDefaultIndianGstPeriod();
    return res.json({
        success: true,
        month: p.month,
        year: p.year,
        note: 'Previous calendar month in Indian financial year format (Apr–Mar).',
    });
}

module.exports = {
    handleGetGstrData,
    handleUploadGstr3b,
    handleUploadGstr1,
    handlePeriodDefault,
};
