/**
 * UPI Analytics Engine
 *
 * Processes bank transaction data to extract UPI-specific analytics:
 *  - Filters transactions where mode = 'UPI'
 *  - Calculates total UPI volume (sum of amounts)
 *  - Computes monthly transaction frequency
 *  - Extracts unique merchant category codes (MCC)
 *  - Generates a merchant diversity score
 */

/**
 * @typedef {Object} UpiAnalytics
 * @property {number}   totalVolume       - Sum of all UPI transaction amounts.
 * @property {number}   transactionCount  - Number of UPI transactions.
 * @property {number}   avgTransactionAmt - Average UPI transaction amount.
 * @property {Object}   monthlyFrequency  - { 'YYYY-MM': count } map.
 * @property {string[]} uniqueMccs        - Distinct merchant category codes.
 * @property {number}   merchantDiversityScore - 0–1 normalised diversity score.
 * @property {Object}   creditDebit       - { credits, debits, inflowVolume, outflowVolume }.
 * @property {Object[]} topMerchants      - Top merchants by volume.
 */

// ─── MCC Inference ─────────────────────────────────────────────────
// In production, MCCs come from the FIP. For analytics, we infer them
// from narration keywords when the raw data doesn't include an MCC field.

const MCC_MAP = [
    { pattern: /salary|payroll|wages/i, mcc: '6012', category: 'Salary / Payroll' },
    { pattern: /rent|housing|apartment/i, mcc: '6513', category: 'Rent / Housing' },
    { pattern: /electric|power|utility|gas|water/i, mcc: '4900', category: 'Utilities' },
    { pattern: /grocer|supermarket|bigbasket|blinkit/i, mcc: '5411', category: 'Groceries' },
    { pattern: /fuel|petrol|diesel|iocl|bpcl|hpcl/i, mcc: '5541', category: 'Fuel' },
    { pattern: /recharge|mobile|airtel|jio|vi\b/i, mcc: '4812', category: 'Telecom' },
    { pattern: /insurance|lic\b|emi\b|premium/i, mcc: '6300', category: 'Insurance' },
    { pattern: /hospital|medical|pharma|apollo/i, mcc: '8062', category: 'Healthcare' },
    { pattern: /shop|amazon|flipkart|myntra|mall/i, mcc: '5311', category: 'Shopping' },
    { pattern: /food|swiggy|zomato|restaurant|cafe/i, mcc: '5812', category: 'Food & Dining' },
    { pattern: /uber|ola|cab|ride|metro|bus|train/i, mcc: '4121', category: 'Transport' },
    { pattern: /freelance|client|consult|project/i, mcc: '7392', category: 'Professional Services' },
    { pattern: /bonus|incentive|reward/i, mcc: '6012', category: 'Income / Bonus' },
    { pattern: /loan|emi|repay/i, mcc: '6010', category: 'Loan / EMI' },
    { pattern: /invest|mutual|sip|stock|demat/i, mcc: '6211', category: 'Investments' },
];

/**
 * Infers the MCC and category from a narration string.
 *
 * @param {string} narration
 * @returns {{ mcc: string, category: string }}
 */
function inferMcc(narration) {
    if (!narration) return { mcc: '0000', category: 'Uncategorised' };

    for (const entry of MCC_MAP) {
        if (entry.pattern.test(narration)) {
            return { mcc: entry.mcc, category: entry.category };
        }
    }
    return { mcc: '0000', category: 'Uncategorised' };
}

// ─── Core Analytics ────────────────────────────────────────────────

/**
 * Filters only UPI transactions from the full transaction set.
 *
 * @param {Object[]} transactions - Array of normalised transactions.
 * @returns {Object[]} UPI-only transactions.
 */
function filterUpiTransactions(transactions) {
    if (!Array.isArray(transactions)) return [];

    return transactions.filter((t) => {
        const mode = (t.mode || '').toUpperCase();
        return mode === 'UPI';
    });
}

/**
 * Calculates the total UPI volume (sum of all amounts).
 *
 * @param {Object[]} upiTxns
 * @returns {number}
 */
function calculateTotalVolume(upiTxns) {
    return Math.round(upiTxns.reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100;
}

/**
 * Computes monthly transaction frequency.
 *
 * @param {Object[]} upiTxns
 * @returns {Object} { 'YYYY-MM': count }
 */
function calculateMonthlyFrequency(upiTxns) {
    const freq = {};

    for (const txn of upiTxns) {
        if (!txn.date) continue;
        const d = new Date(txn.date);
        if (isNaN(d.getTime())) continue;

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        freq[key] = (freq[key] || 0) + 1;
    }

    return freq;
}

/**
 * Extracts unique merchant category codes from UPI transactions.
 * Infers MCC from narration when not explicitly provided.
 *
 * @param {Object[]} upiTxns
 * @returns {{ uniqueMccs: string[], mccDetails: Object[] }}
 */
function extractUniqueMccs(upiTxns) {
    const mccSet = new Map();

    for (const txn of upiTxns) {
        const rawMcc = txn.mcc || txn.merchantCategoryCode;
        const { mcc, category } = rawMcc
            ? { mcc: rawMcc, category: txn.category || 'Unknown' }
            : inferMcc(txn.narration);

        if (!mccSet.has(mcc)) {
            mccSet.set(mcc, { mcc, category, count: 0, volume: 0 });
        }
        const entry = mccSet.get(mcc);
        entry.count += 1;
        entry.volume = Math.round((entry.volume + (txn.amount || 0)) * 100) / 100;
    }

    const mccDetails = Array.from(mccSet.values()).sort((a, b) => b.volume - a.volume);
    const uniqueMccs = mccDetails.map((m) => m.mcc);

    return { uniqueMccs, mccDetails };
}

/**
 * Generates a merchant diversity score (0–1).
 *
 * Uses normalised Shannon entropy across MCC categories.
 *   H = -Σ(p_i × ln(p_i)) / ln(n)
 *
 * 0 = all transactions in one category.
 * 1 = perfectly even distribution across all categories.
 *
 * @param {Object[]} mccDetails - From extractUniqueMccs.
 * @param {number} totalCount - Total UPI transaction count.
 * @returns {number} Score between 0 and 1.
 */
function calculateMerchantDiversity(mccDetails, totalCount) {
    if (!mccDetails || mccDetails.length <= 1 || totalCount === 0) return 0;

    const n = mccDetails.length;
    let entropy = 0;

    for (const entry of mccDetails) {
        const p = entry.count / totalCount;
        if (p > 0) {
            entropy -= p * Math.log(p);
        }
    }

    const maxEntropy = Math.log(n);
    const score = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return Math.round(score * 1000) / 1000; // 3 decimal places
}

// ─── Full Pipeline ─────────────────────────────────────────────────

/**
 * Runs the full UPI analytics pipeline on a set of transactions.
 *
 * @param {Object[]} transactions - All transactions (any mode).
 * @returns {UpiAnalytics}
 */
function analyzeUpi(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return emptyAnalytics();
    }

    // 1. Filter UPI
    const upiTxns = filterUpiTransactions(transactions);

    if (upiTxns.length === 0) {
        return emptyAnalytics();
    }

    // 2. Total volume
    const totalVolume = calculateTotalVolume(upiTxns);

    // 3. Monthly frequency
    const monthlyFrequency = calculateMonthlyFrequency(upiTxns);

    // 4. MCC extraction
    const { uniqueMccs, mccDetails } = extractUniqueMccs(upiTxns);

    // 5. Merchant diversity score
    const merchantDiversityScore = calculateMerchantDiversity(mccDetails, upiTxns.length);

    // 6. Credit / debit split
    const credits = upiTxns.filter((t) => t.type === 'CREDIT');
    const debits = upiTxns.filter((t) => t.type === 'DEBIT');
    const inflowVolume = Math.round(credits.reduce((s, t) => s + t.amount, 0) * 100) / 100;
    const outflowVolume = Math.round(debits.reduce((s, t) => s + t.amount, 0) * 100) / 100;

    // 7. Average
    const avgTransactionAmt = Math.round((totalVolume / upiTxns.length) * 100) / 100;

    // 8. Top merchants (by narration grouping)
    const topMerchants = buildTopMerchants(upiTxns);

    return {
        transactionCount: upiTxns.length,
        totalVolume,
        avgTransactionAmt,
        monthlyFrequency,
        uniqueMccs,
        mccDetails,
        merchantDiversityScore,
        creditDebit: {
            creditCount: credits.length,
            debitCount: debits.length,
            inflowVolume,
            outflowVolume,
            netFlow: Math.round((inflowVolume - outflowVolume) * 100) / 100,
        },
        topMerchants,
        transactions: upiTxns,
    };
}

/**
 * Groups UPI transactions by narration to find top merchants.
 */
function buildTopMerchants(upiTxns) {
    const merchantMap = new Map();

    for (const txn of upiTxns) {
        const key = (txn.narration || 'Unknown').trim();
        if (!merchantMap.has(key)) {
            merchantMap.set(key, { name: key, count: 0, volume: 0 });
        }
        const m = merchantMap.get(key);
        m.count += 1;
        m.volume = Math.round((m.volume + (txn.amount || 0)) * 100) / 100;
    }

    return Array.from(merchantMap.values())
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10);
}

function emptyAnalytics() {
    return {
        transactionCount: 0,
        totalVolume: 0,
        avgTransactionAmt: 0,
        monthlyFrequency: {},
        uniqueMccs: [],
        mccDetails: [],
        merchantDiversityScore: 0,
        creditDebit: {
            creditCount: 0, debitCount: 0,
            inflowVolume: 0, outflowVolume: 0, netFlow: 0,
        },
        topMerchants: [],
        transactions: [],
    };
}

module.exports = {
    analyzeUpi,
    filterUpiTransactions,
    calculateTotalVolume,
    calculateMonthlyFrequency,
    extractUniqueMccs,
    calculateMerchantDiversity,
    inferMcc,
};
