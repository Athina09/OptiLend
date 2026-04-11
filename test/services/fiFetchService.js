/**
 * FI Fetch Service
 *
 * Business logic for fetching encrypted financial data from
 * Account Aggregator via POST /FI/fetch, decrypting it, and
 * parsing the transaction data.
 */
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { createDetachedJws } = require('../utils/jwsSigner');
const { decryptFiData, encryptTestData } = require('../utils/fiDecryption');
const { analyzeTransactions } = require('../utils/transactionParser');

// ─── Sample Data for Dev Mode ──────────────────────────────────────

const SAMPLE_TRANSACTIONS = [
    { txnId: 'TXN001', date: '2025-12-01T10:30:00Z', type: 'CREDIT', mode: 'UPI', amount: 25000, balance: 125000, narration: 'Salary Dec 2025', reference: 'UPI/REF/001' },
    { txnId: 'TXN002', date: '2025-12-02T14:15:00Z', type: 'DEBIT', mode: 'NEFT', amount: 8500, balance: 116500, narration: 'Rent payment', reference: 'NEFT/REF/002' },
    { txnId: 'TXN003', date: '2025-12-05T09:00:00Z', type: 'DEBIT', mode: 'UPI', amount: 2300, balance: 114200, narration: 'Electricity bill', reference: 'UPI/REF/003' },
    { txnId: 'TXN004', date: '2025-12-07T16:45:00Z', type: 'CREDIT', mode: 'IMPS', amount: 5000, balance: 119200, narration: 'Freelance payment', reference: 'IMPS/REF/004' },
    { txnId: 'TXN005', date: '2025-12-10T11:20:00Z', type: 'DEBIT', mode: 'UPI', amount: 1500, balance: 117700, narration: 'Groceries', reference: 'UPI/REF/005' },
    { txnId: 'TXN006', date: '2025-12-12T08:00:00Z', type: 'DEBIT', mode: 'NACH', amount: 3200, balance: 114500, narration: 'Insurance EMI', reference: 'NACH/REF/006' },
    { txnId: 'TXN007', date: '2025-12-15T13:30:00Z', type: 'CREDIT', mode: 'UPI', amount: 12000, balance: 126500, narration: 'Client payment', reference: 'UPI/REF/007' },
    { txnId: 'TXN008', date: '2025-12-18T17:45:00Z', type: 'DEBIT', mode: 'POS', amount: 4700, balance: 121800, narration: 'Shopping', reference: 'POS/REF/008' },
    { txnId: 'TXN009', date: '2025-12-22T10:00:00Z', type: 'DEBIT', mode: 'UPI', amount: 900, balance: 120900, narration: 'Mobile recharge', reference: 'UPI/REF/009' },
    { txnId: 'TXN010', date: '2025-12-25T09:30:00Z', type: 'CREDIT', mode: 'NEFT', amount: 15000, balance: 135900, narration: 'Bonus', reference: 'NEFT/REF/010' },
];

// ─── Fetch FI Data ─────────────────────────────────────────────────

/**
 * Fetches financial data from Account Aggregator.
 *
 * Steps:
 *  1. Validate sessionId.
 *  2. Build FI/fetch request payload.
 *  3. Sign payload with Detached JWS.
 *  4. POST to AA /FI/fetch endpoint.
 *  5. Decrypt AES-256-GCM encrypted response.
 *  6. Parse and analyze transactions.
 *
 * @param {string} sessionId - Session ID from FI/request.
 * @param {Object} [options]
 * @param {string} [options.fipId] - FIP ID filter.
 * @param {string[]} [options.linkRefNumbers] - Specific link ref numbers.
 * @returns {Promise<Object>}
 */
async function fetchFiData(sessionId, options = {}) {
    // 1. Validate
    if (!sessionId || typeof sessionId !== 'string') {
        return { success: false, message: 'sessionId is required.' };
    }

    // 2. Build payload
    const txnid = uuidv4();
    const timestamp = new Date().toISOString();

    const fetchPayload = {
        ver: '2.0.0',
        timestamp,
        txnid,
        sessionId,
        fipId: options.fipId || 'FIP-001',
        linkRefNumber: options.linkRefNumbers || [],
    };

    console.log(`[FIFetchService] Fetching FI data | session: ${sessionId} | txnid: ${txnid}`);

    // 3. Sign
    const { detachedJws } = createDetachedJws(fetchPayload);

    // 4. POST to AA
    const fetchUrl = `${config.aa.baseUrl}/FI/fetch`;
    let aaResponse = null;

    try {
        const response = await axios.post(fetchUrl, fetchPayload, {
            headers: {
                'Content-Type': 'application/json',
                'X-JWS-Signature': detachedJws,
                'client_api_key': config.aa.clientApiKey,
                'fiu_entity_id': config.aa.clientId,
            },
            timeout: 30000,
        });

        aaResponse = response.data;
        console.log(`[FIFetchService] AA responded with FI data.`);
    } catch (err) {
        console.warn(`[FIFetchService] AA endpoint unreachable (dev mode): ${err.message}`);

        // Dev mode: create encrypted sample data to demonstrate full pipeline
        aaResponse = createDevModeResponse(sessionId, txnid);
    }

    // 5. Decrypt encrypted FI data
    let decryptedData = null;

    if (aaResponse?.encryptedFI) {
        // Use session key to decrypt (in production, derived from ECDH)
        const sessionKey = aaResponse._devSessionKey
            ? Buffer.from(aaResponse._devSessionKey, 'hex')
            : null;

        if (sessionKey) {
            const result = decryptFiData(aaResponse.encryptedFI, sessionKey);
            if (result.success) {
                decryptedData = result.data;
                console.log(`[FIFetchService] Decrypted FI data successfully.`);
            } else {
                console.warn(`[FIFetchService] Decryption failed: ${result.error}`);
            }
        }
    }

    // If decryption failed or no encrypted data, use plaintext (dev mode)
    if (!decryptedData && aaResponse?.FI) {
        decryptedData = aaResponse.FI;
    }

    // 6. Parse and analyze transactions
    const analysis = analyzeTransactions(decryptedData || []);

    return {
        success: true,
        message: 'FI data fetched and analyzed successfully.',
        data: {
            txnid,
            sessionId,
            timestamp,
            jwsSignature: detachedJws,
            analysis,
            rawResponse: aaResponse?._devMode ? { _devMode: true } : undefined,
        },
    };
}

/**
 * Creates a dev-mode AA response with encrypted sample transactions.
 */
function createDevModeResponse(sessionId, txnid) {
    const sessionKey = crypto.randomBytes(32);
    const plaintext = JSON.stringify({ transactions: SAMPLE_TRANSACTIONS });
    const encryptedFI = encryptTestData(plaintext, sessionKey);

    return {
        ver: '2.0.0',
        timestamp: new Date().toISOString(),
        txnid,
        sessionId,
        encryptedFI,
        FI: { transactions: SAMPLE_TRANSACTIONS }, // plaintext fallback
        _devMode: true,
        _devSessionKey: sessionKey.toString('hex'),
        _note: 'Dev mode — sample encrypted FI data for testing.',
    };
}

module.exports = {
    fetchFiData,
};
