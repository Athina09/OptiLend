/**
 * GST Filing Compliance Calculator
 *
 * Analyses GST return filing data (GSTR-1 and GSTR-3B) to compute:
 *  - On-time vs delayed filing classification
 *  - Filing compliance score (0–1)
 *  - Average monthly turnover
 *  - Total tax paid
 *
 * Due date rules (standard, non-QRMP):
 *   GSTR-1  → 11th of the month following the return period
 *   GSTR-3B → 20th of the month following the return period
 */

// ─── Due Date Logic ────────────────────────────────────────────────

const DUE_DAY = {
    'GSTR-1': 11,
    'GSTR-3B': 20,
};

/**
 * Computes the statutory due date for a GST return.
 *
 * @param {string} returnType - 'GSTR-1' or 'GSTR-3B'.
 * @param {string} filingPeriod - 'YYYY-MM' format (e.g. '2025-06').
 * @returns {Date} Due date.
 */
function computeDueDate(returnType, filingPeriod) {
    const [year, month] = filingPeriod.split('-').map(Number);
    const dueDay = DUE_DAY[returnType] || 20;

    // Due date is in the NEXT month
    let dueMonth = month + 1;
    let dueYear = year;
    if (dueMonth > 12) {
        dueMonth = 1;
        dueYear++;
    }

    return new Date(dueYear, dueMonth - 1, dueDay, 23, 59, 59);
}

/**
 * Classifies a single filing as on-time or delayed.
 *
 * @param {Object} filing
 * @returns {'ON_TIME' | 'DELAYED'}
 */
function classifyFiling(filing) {
    const returnType = (filing.returnType || 'GSTR-3B').toUpperCase();
    const period = filing.filingPeriod;
    const filedDate = new Date(filing.filingDate);

    if (!period || isNaN(filedDate.getTime())) return 'DELAYED';

    const dueDate = computeDueDate(returnType, period);
    return filedDate <= dueDate ? 'ON_TIME' : 'DELAYED';
}

// ─── Core Calculator ───────────────────────────────────────────────

/**
 * Calculates GST filing compliance metrics.
 *
 * @param {Object[]} filings - Array of filing records.
 * @returns {Object} Structured compliance output.
 */
function calculateCompliance(filings) {
    if (!Array.isArray(filings) || filings.length === 0) {
        return emptyResult();
    }

    let onTimeFilings = 0;
    let delayedFilings = 0;
    let totalTurnover = 0;
    let totalTaxPaid = 0;
    const classified = [];

    for (const filing of filings) {
        const status = classifyFiling(filing);
        const turnover = parseFloat(filing.turnover || 0);
        const taxPaid = parseFloat(filing.taxPaid || 0);

        if (status === 'ON_TIME') onTimeFilings++;
        else delayedFilings++;

        totalTurnover += isNaN(turnover) ? 0 : turnover;
        totalTaxPaid += isNaN(taxPaid) ? 0 : taxPaid;

        const returnType = (filing.returnType || 'GSTR-3B').toUpperCase();
        const dueDate = filing.filingPeriod
            ? computeDueDate(returnType, filing.filingPeriod)
            : null;

        classified.push({
            returnType,
            filingPeriod: filing.filingPeriod || '',
            turnover: isNaN(turnover) ? 0 : turnover,
            taxPaid: isNaN(taxPaid) ? 0 : taxPaid,
            filingDate: filing.filingDate || '',
            dueDate: dueDate ? dueDate.toISOString() : '',
            classification: status,
            delayDays: status === 'DELAYED' && dueDate && filing.filingDate
                ? computeDelayDays(dueDate, new Date(filing.filingDate))
                : 0,
        });
    }

    const totalFilings = filings.length;
    const complianceScore = Math.round((onTimeFilings / totalFilings) * 10000) / 10000;
    const avgTurnover = Math.round((totalTurnover / totalFilings) * 100) / 100;

    // Per return-type breakdown
    const returnTypeBreakdown = buildReturnTypeBreakdown(classified);

    return {
        totalFilings,
        onTimeFilings,
        delayedFilings,
        complianceScore,
        avgTurnover,
        totalTaxPaid: Math.round(totalTaxPaid * 100) / 100,
        returnTypeBreakdown,
        filings: classified,
    };
}

function computeDelayDays(dueDate, filedDate) {
    const diffMs = filedDate.getTime() - dueDate.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Builds per-return-type breakdown (GSTR-1, GSTR-3B).
 */
function buildReturnTypeBreakdown(classified) {
    const types = {};

    for (const f of classified) {
        const rt = f.returnType;
        if (!types[rt]) {
            types[rt] = { total: 0, onTime: 0, delayed: 0, totalTurnover: 0, totalTaxPaid: 0 };
        }
        types[rt].total++;
        types[rt].totalTurnover += f.turnover;
        types[rt].totalTaxPaid += f.taxPaid;
        if (f.classification === 'ON_TIME') types[rt].onTime++;
        else types[rt].delayed++;
    }

    for (const rt of Object.keys(types)) {
        const t = types[rt];
        t.complianceRate = t.total > 0
            ? Math.round((t.onTime / t.total) * 10000) / 10000
            : 0;
        t.totalTurnover = Math.round(t.totalTurnover * 100) / 100;
        t.totalTaxPaid = Math.round(t.totalTaxPaid * 100) / 100;
    }

    return types;
}

/**
 * Formats the final JSON analytics response.
 */
function formatGstResponse(compliance, meta = {}) {
    return {
        success: true,
        message: `GST compliance analysis complete: ${compliance.totalFilings} filings processed.`,
        data: {
            summary: {
                totalFilings: compliance.totalFilings,
                onTimeFilings: compliance.onTimeFilings,
                delayedFilings: compliance.delayedFilings,
                complianceScore: compliance.complianceScore,
                avgTurnover: compliance.avgTurnover,
                totalTaxPaid: compliance.totalTaxPaid,
            },
            returnTypeBreakdown: compliance.returnTypeBreakdown,
            filings: compliance.filings,
            ...meta,
        },
    };
}

function emptyResult() {
    return {
        totalFilings: 0,
        onTimeFilings: 0,
        delayedFilings: 0,
        complianceScore: 0,
        avgTurnover: 0,
        totalTaxPaid: 0,
        returnTypeBreakdown: {},
        filings: [],
    };
}

module.exports = {
    computeDueDate,
    classifyFiling,
    calculateCompliance,
    formatGstResponse,
};
