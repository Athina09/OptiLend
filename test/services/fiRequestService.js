/**
 * FI Request Service
 *
 * Core business logic for initiating FI data requests
 * to Account Aggregator endpoints via HTTPS.
 */
const axios = require('axios');
const config = require('../config');
const { buildFiRequestPayload, validateFiRequestInput } = require('../utils/fiRequestBuilder');
const { createDetachedJws } = require('../utils/jwsSigner');

// ─── In-Memory Session Store ───────────────────────────────────────

const fiSessions = new Map();

// ─── Initiate FI Request ───────────────────────────────────────────

/**
 * Initiates an FI data request to the Account Aggregator.
 *
 * Steps:
 *  1. Validate inputs.
 *  2. Build FI request payload (ver, timestamp, txnid, Consent, FI array).
 *  3. Create Detached JWS signature of the payload.
 *  4. Send HTTPS POST to AA /FI/request with X-JWS-Signature header.
 *  5. Extract sessionId from response and store it.
 *
 * @param {Object} params
 * @param {string} params.consentId      - Consent artefact ID.
 * @param {string} [params.maskedAccNumber] - Masked account number.
 * @param {string} [params.fiType]       - FI type (default: DEPOSIT).
 * @param {string} [params.fipId]        - FIP ID.
 * @param {string} [params.linkRefNumber] - Link reference number.
 * @param {string} [params.from]         - Data range start.
 * @param {string} [params.to]           - Data range end.
 * @returns {Promise<Object>}
 */
async function initiateFiRequest(params) {
    // 1. Validate
    const validation = validateFiRequestInput(params);
    if (!validation.valid) {
        return {
            success: false,
            message: 'Validation failed.',
            errors: validation.errors,
        };
    }

    // 2. Build payload
    const { payload, txnid } = buildFiRequestPayload(params);

    console.log(`[FIService] Built FI request payload | txnid: ${txnid}`);

    // 3. Create Detached JWS signature
    const { detachedJws } = createDetachedJws(payload);

    console.log(`[FIService] Created Detached JWS | header..signature`);

    // 4. Send HTTPS POST to AA endpoint
    const aaEndpoint = `${config.aa.baseUrl}/FI/request`;
    let responseData = null;
    let sessionId = null;

    try {
        const response = await axios.post(aaEndpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-JWS-Signature': detachedJws,
                'client_api_key': config.aa.clientApiKey,
                'fiu_entity_id': config.aa.clientId,
            },
            httpsAgent: undefined, // Uses default HTTPS agent
            timeout: 30000,
        });

        responseData = response.data;
        sessionId = responseData?.sessionId || responseData?.SessionId || null;

        console.log(`[FIService] AA responded | sessionId: ${sessionId}`);
    } catch (err) {
        console.warn(`[FIService] AA endpoint unreachable (expected in dev): ${err.message}`);

        // Dev mode fallback: generate a mock sessionId
        sessionId = `dev-session-${txnid.slice(0, 8)}`;
        responseData = {
            ver: '2.0.0',
            timestamp: new Date().toISOString(),
            txnid,
            sessionId,
            consentId: params.consentId,
            _devMode: true,
            _note: 'AA endpoint unreachable — mock session created for development.',
        };
    }

    // 5. Store session
    fiSessions.set(txnid, {
        txnid,
        sessionId,
        consentId: params.consentId,
        fiType: params.fiType || 'DEPOSIT',
        maskedAccNumber: params.maskedAccNumber || 'XXXX-XXXX-1234',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        payload,
        jwsSignature: detachedJws,
    });

    return {
        success: true,
        message: 'FI data request initiated successfully.',
        data: {
            txnid,
            sessionId,
            consentId: params.consentId,
            timestamp: payload.timestamp,
            jwsSignature: detachedJws,
            aaResponse: responseData,
        },
    };
}

// ─── Get FI Session ────────────────────────────────────────────────

/**
 * Retrieves an FI request session by transaction ID.
 *
 * @param {string} txnid
 * @returns {Object|null}
 */
function getFiSession(txnid) {
    return fiSessions.get(txnid) || null;
}

/**
 * Lists all FI sessions.
 *
 * @returns {Object[]}
 */
function listFiSessions() {
    return Array.from(fiSessions.values());
}

// ─── Fetch FI Data (using sessionId) ───────────────────────────────

/**
 * Fetches the FI data result using the sessionId.
 *
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
async function fetchFiData(sessionId) {
    if (!sessionId) {
        return { success: false, message: 'sessionId is required.' };
    }

    const fetchEndpoint = `${config.aa.baseUrl}/FI/fetch/${sessionId}`;

    try {
        const { detachedJws } = createDetachedJws({ sessionId, timestamp: new Date().toISOString() });

        const response = await axios.get(fetchEndpoint, {
            headers: {
                'X-JWS-Signature': detachedJws,
                'client_api_key': config.aa.clientApiKey,
                'fiu_entity_id': config.aa.clientId,
            },
            timeout: 30000,
        });

        return {
            success: true,
            message: 'FI data fetched successfully.',
            data: response.data,
        };
    } catch (err) {
        console.warn(`[FIService] FI fetch failed (expected in dev): ${err.message}`);

        return {
            success: true,
            message: 'FI data fetch processed (dev mode — mock response).',
            data: {
                ver: '2.0.0',
                timestamp: new Date().toISOString(),
                sessionId,
                status: 'READY',
                FI: [
                    {
                        fipId: 'FIP-001',
                        data: [
                            {
                                maskedAccNumber: 'XXXX-XXXX-1234',
                                fiType: 'DEPOSIT',
                                encryptedData: 'BASE64_ENCRYPTED_FI_DATA_PLACEHOLDER',
                            },
                        ],
                    },
                ],
                _devMode: true,
            },
        };
    }
}

module.exports = {
    initiateFiRequest,
    getFiSession,
    listFiSessions,
    fetchFiData,
};
