/**
 * Payment Reliability Calculator
 *
 * Analyzes utility bill payment records to compute:
 *  - On-time vs delayed payment classification
 *  - Payment success rate
 *  - Reliability score (0–100) for credit underwriting
 */

/**
 * @typedef {Object} BillRecord
 * @property {string} billerName    - Name of the biller/utility provider.
 * @property {string} billCategory  - ELECTRICITY | WATER | BROADBAND.
 * @property {number} billAmount    - Bill amount in INR.
 * @property {string} dueDate       - ISO 8601 due date.
 * @property {string} paymentDate   - ISO 8601 last paid date.
 * @property {string} paymentStatus - PAID | UNPAID | PARTIAL.
 */

/**
 * Classifies a single bill as on-time or delayed.
 *
 * On-time:  paymentDate <= dueDate
 * Delayed:  paymentDate > dueDate  OR  unpaid
 *
 * @param {BillRecord} bill
 * @returns {'ON_TIME' | 'DELAYED' | 'UNPAID'}
 */
function classifyPayment(bill) {
    if (!bill.paymentDate || (bill.paymentStatus || '').toUpperCase() === 'UNPAID') {
        return 'UNPAID';
    }

    const due = new Date(bill.dueDate);
    const paid = new Date(bill.paymentDate);

    if (isNaN(due.getTime()) || isNaN(paid.getTime())) {
        return 'DELAYED'; // treat invalid dates as delayed
    }

    return paid <= due ? 'ON_TIME' : 'DELAYED';
}

/**
 * Calculates payment reliability metrics from an array of bill records.
 *
 * @param {BillRecord[]} bills
 * @returns {Object} Structured reliability output.
 */
function calculateReliability(bills) {
    if (!Array.isArray(bills) || bills.length === 0) {
        return emptyResult();
    }

    let onTimePayments = 0;
    let delayedPayments = 0;
    let unpaidBills = 0;
    const classified = [];

    for (const bill of bills) {
        const status = classifyPayment(bill);

        if (status === 'ON_TIME') onTimePayments++;
        else if (status === 'DELAYED') delayedPayments++;
        else unpaidBills++;

        classified.push({
            billerName: bill.billerName || 'Unknown',
            billCategory: bill.billCategory || 'UNKNOWN',
            billAmount: bill.billAmount || 0,
            dueDate: bill.dueDate || '',
            paymentDate: bill.paymentDate || '',
            originalStatus: bill.paymentStatus || '',
            classification: status,
            delayDays: status === 'DELAYED' ? computeDelayDays(bill.dueDate, bill.paymentDate) : 0,
        });
    }

    const totalBills = bills.length;
    const paidBills = onTimePayments + delayedPayments;
    const paymentSuccessRate = totalBills > 0
        ? Math.round((onTimePayments / totalBills) * 10000) / 10000
        : 0;
    const reliabilityScore = Math.round(paymentSuccessRate * 100 * 100) / 100;

    // Per-category breakdown
    const categoryBreakdown = buildCategoryBreakdown(classified);

    return {
        totalBills,
        onTimePayments,
        delayedPayments,
        unpaidBills,
        paidBills,
        paymentSuccessRate,
        reliabilityScore,
        categoryBreakdown,
        bills: classified,
    };
}

/**
 * Computes the number of days between due date and payment date.
 */
function computeDelayDays(dueDate, paymentDate) {
    const due = new Date(dueDate);
    const paid = new Date(paymentDate);
    if (isNaN(due.getTime()) || isNaN(paid.getTime())) return 0;

    const diffMs = paid.getTime() - due.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Builds per-category breakdown (ELECTRICITY, WATER, BROADBAND).
 */
function buildCategoryBreakdown(classified) {
    const cats = {};

    for (const bill of classified) {
        const cat = bill.billCategory.toUpperCase();
        if (!cats[cat]) {
            cats[cat] = { total: 0, onTime: 0, delayed: 0, unpaid: 0, totalAmount: 0 };
        }
        cats[cat].total++;
        cats[cat].totalAmount += bill.billAmount;
        if (bill.classification === 'ON_TIME') cats[cat].onTime++;
        else if (bill.classification === 'DELAYED') cats[cat].delayed++;
        else cats[cat].unpaid++;
    }

    // Add per-category success rate
    for (const cat of Object.keys(cats)) {
        const c = cats[cat];
        c.successRate = c.total > 0
            ? Math.round((c.onTime / c.total) * 10000) / 10000
            : 0;
        c.totalAmount = Math.round(c.totalAmount * 100) / 100;
    }

    return cats;
}

/**
 * Formats the final JSON response.
 *
 * @param {Object} reliability - Output from calculateReliability.
 * @param {Object} [meta] - Additional metadata.
 * @returns {Object} Structured JSON response.
 */
function formatResponse(reliability, meta = {}) {
    return {
        success: true,
        message: `Utility payment analysis complete: ${reliability.totalBills} bills processed.`,
        data: {
            summary: {
                totalBills: reliability.totalBills,
                onTimePayments: reliability.onTimePayments,
                delayedPayments: reliability.delayedPayments,
                unpaidBills: reliability.unpaidBills,
                paymentSuccessRate: reliability.paymentSuccessRate,
                reliabilityScore: reliability.reliabilityScore,
            },
            categoryBreakdown: reliability.categoryBreakdown,
            bills: reliability.bills,
            ...meta,
        },
    };
}

function emptyResult() {
    return {
        totalBills: 0,
        onTimePayments: 0,
        delayedPayments: 0,
        unpaidBills: 0,
        paidBills: 0,
        paymentSuccessRate: 0,
        reliabilityScore: 0,
        categoryBreakdown: {},
        bills: [],
    };
}

module.exports = {
    classifyPayment,
    calculateReliability,
    computeDelayDays,
    formatResponse,
};
