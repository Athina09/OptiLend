/**
 * Transaction Parser
 *
 * Parses decrypted financial information data from Account Aggregator
 * FI/fetch responses. Extracts transaction details, separates CREDIT
 * and DEBIT transactions, and calculates inflow/outflow summaries.
 */

/**
 * @typedef {Object} Transaction
 * @property {string} txnId      - Transaction identifier.
 * @property {string} date       - Transaction date (ISO 8601).
 * @property {string} type       - 'CREDIT' or 'DEBIT'.
 * @property {string} mode       - Transaction mode (UPI, NEFT, IMPS, etc.).
 * @property {number} amount     - Transaction amount.
 * @property {number} balance    - Account balance after transaction.
 * @property {string} narration  - Transaction description/narration.
 * @property {string} reference  - Reference number.
 */

/**
 * Parses raw FI data (JSON or XML-like) into structured transactions.
 *
 * Supports multiple input formats:
 *  - JSON array of transactions
 *  - AA FI response with Account.Transactions.Transaction array
 *  - Flat transaction objects
 *
 * @param {string|Object} rawData - Decrypted FI data (JSON string or parsed object).
 * @returns {{ success: boolean, transactions?: Transaction[], error?: string }}
 */
function parseTransactions(rawData) {
    try {
        let data;

        // Parse if string
        if (typeof rawData === 'string') {
            try {
                data = JSON.parse(rawData);
            } catch {
                return { success: false, error: 'Failed to parse FI data as JSON.' };
            }
        } else {
            data = rawData;
        }

        // Extract transaction array from various AA response formats
        let rawTransactions = extractTransactionArray(data);

        if (!rawTransactions || rawTransactions.length === 0) {
            return {
                success: true,
                transactions: [],
                summary: createEmptySummary(),
            };
        }

        // Normalize each transaction
        const transactions = rawTransactions.map(normalizeTransaction).filter(Boolean);

        return {
            success: true,
            transactions,
            count: transactions.length,
        };
    } catch (err) {
        return { success: false, error: `Transaction parsing failed: ${err.message}` };
    }
}

/**
 * Extracts the transaction array from various AA response structures.
 */
function extractTransactionArray(data) {
    // Direct array
    if (Array.isArray(data)) return data;

    // AA format: { Account: { Transactions: { Transaction: [...] } } }
    if (data?.Account?.Transactions?.Transaction) {
        return Array.isArray(data.Account.Transactions.Transaction)
            ? data.Account.Transactions.Transaction
            : [data.Account.Transactions.Transaction];
    }

    // Nested: { Transactions: [...] }
    if (data?.Transactions && Array.isArray(data.Transactions)) {
        return data.Transactions;
    }

    // Nested: { transactions: [...] }
    if (data?.transactions && Array.isArray(data.transactions)) {
        return data.transactions;
    }

    // Data array: { data: [...] }
    if (data?.data && Array.isArray(data.data)) {
        return data.data;
    }

    // Single transaction wrapped in an object
    if (data?.txnId || data?.transactionId || data?.amount) {
        return [data];
    }

    return [];
}

/**
 * Normalizes a transaction object into a consistent format.
 *
 * @param {Object} raw - Raw transaction from AA.
 * @returns {Transaction|null}
 */
function normalizeTransaction(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const type = detectTransactionType(raw);
    const amount = parseFloat(raw.amount || raw.Amount || raw.txnAmount || 0);
    const balance = parseFloat(raw.balance || raw.Balance || raw.currentBalance || raw.closingBalance || 0);

    return {
        txnId: raw.txnId || raw.transactionId || raw.TransactionId || raw.refNo || '',
        date: raw.date || raw.Date || raw.transactionDateTime || raw.TransactionTimestamp || raw.valueDate || '',
        type,
        mode: raw.mode || raw.Mode || raw.transactionMode || raw.channel || '',
        amount: isNaN(amount) ? 0 : amount,
        balance: isNaN(balance) ? 0 : balance,
        narration: raw.narration || raw.Narration || raw.description || raw.remarks || '',
        reference: raw.reference || raw.Reference || raw.refNo || raw.referenceNumber || '',
    };
}

/**
 * Detects whether a transaction is CREDIT or DEBIT.
 */
function detectTransactionType(raw) {
    const type = (
        raw.type || raw.Type || raw.transactionType ||
        raw.TransactionType || raw.txnType || ''
    ).toUpperCase();

    if (type.includes('CREDIT') || type === 'CR' || type === 'C') return 'CREDIT';
    if (type.includes('DEBIT') || type === 'DR' || type === 'D') return 'DEBIT';

    // Fallback: check narration for hints
    const narration = (raw.narration || raw.description || '').toLowerCase();
    if (narration.includes('credit') || narration.includes('received') || narration.includes('deposit')) {
        return 'CREDIT';
    }

    return 'DEBIT'; // Default to DEBIT if unknown
}

/**
 * Separates transactions into CREDIT and DEBIT arrays.
 *
 * @param {Transaction[]} transactions
 * @returns {{ credits: Transaction[], debits: Transaction[] }}
 */
function separateTransactions(transactions) {
    const credits = transactions.filter((t) => t.type === 'CREDIT');
    const debits = transactions.filter((t) => t.type === 'DEBIT');
    return { credits, debits };
}

/**
 * Calculates inflow (total credits) and outflow (total debits).
 *
 * @param {Transaction[]} transactions
 * @returns {Object} Financial summary.
 */
function calculateFlows(transactions) {
    const { credits, debits } = separateTransactions(transactions);

    const totalInflow = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = debits.reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalInflow - totalOutflow;

    return {
        totalInflow: Math.round(totalInflow * 100) / 100,
        totalOutflow: Math.round(totalOutflow * 100) / 100,
        netFlow: Math.round(netFlow * 100) / 100,
        creditCount: credits.length,
        debitCount: debits.length,
        totalTransactions: transactions.length,
        credits,
        debits,
    };
}

/**
 * Full analysis pipeline: parse → separate → calculate.
 *
 * @param {string|Object} rawData
 * @returns {Object}
 */
function analyzeTransactions(rawData) {
    const parsed = parseTransactions(rawData);
    if (!parsed.success) return parsed;

    const flows = calculateFlows(parsed.transactions);

    return {
        success: true,
        ...flows,
    };
}

function createEmptySummary() {
    return {
        totalInflow: 0,
        totalOutflow: 0,
        netFlow: 0,
        creditCount: 0,
        debitCount: 0,
        totalTransactions: 0,
        credits: [],
        debits: [],
    };
}

module.exports = {
    parseTransactions,
    separateTransactions,
    calculateFlows,
    analyzeTransactions,
    normalizeTransaction,
};
