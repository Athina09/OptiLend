/**
 * FI Request Payload Builder
 *
 * Constructs the JSON payload for POST /FI/request
 * as per ReBIT Account Aggregator API v2.0 specification.
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Builds the FI data request payload.
 *
 * @param {Object} params
 * @param {string} params.consentId     - The consent artefact ID.
 * @param {string} [params.consentHandleId] - Consent handle ID (optional).
 * @param {string} [params.maskedAccNumber] - Masked account number (e.g., 'XXXX-XXXX-1234').
 * @param {string} [params.fiType]      - Financial information type (default: 'DEPOSIT').
 * @param {string} [params.fipId]       - Financial Information Provider ID.
 * @param {string} [params.linkRefNumber] - Link reference number.
 * @param {string} [params.from]        - Data range start (ISO 8601).
 * @param {string} [params.to]          - Data range end (ISO 8601).
 * @returns {{ payload: Object, txnid: string }}
 */
function buildFiRequestPayload({
    consentId,
    consentHandleId,
    maskedAccNumber = 'XXXX-XXXX-1234',
    fiType = 'DEPOSIT',
    fipId = 'FIP-001',
    linkRefNumber,
    from,
    to,
}) {
    const txnid = uuidv4();
    const timestamp = new Date().toISOString();
    const linkRef = linkRefNumber || uuidv4();

    const payload = {
        ver: '2.0.0',
        timestamp,
        txnid,
        Consent: {
            id: consentId,
            digitalSignature: '', // Populated during signing
        },
        FIDataRange: {
            from: from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            to: to || timestamp,
        },
        KeyMaterial: {
            cryptoAlg: 'ECDH',
            curve: 'Curve25519',
            params: {
                KeyPairGenerator: 'ECDH',
            },
            DHPublicKey: {
                expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                Parameters: '',
                KeyValue: '', // Would be populated with actual ECDH key in production
            },
            Nonce: uuidv4().replace(/-/g, ''),
        },
        FI: [
            {
                fipId,
                data: [
                    {
                        linkRefNumber: linkRef,
                        maskedAccNumber,
                        fiType,
                    },
                ],
            },
        ],
    };

    return { payload, txnid };
}

/**
 * Validates the inputs for an FI request.
 *
 * @param {Object} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFiRequestInput(params) {
    const errors = [];

    if (!params.consentId || typeof params.consentId !== 'string') {
        errors.push('consentId is required and must be a string.');
    }

    if (params.maskedAccNumber && typeof params.maskedAccNumber !== 'string') {
        errors.push('maskedAccNumber must be a string.');
    }

    const validFiTypes = ['DEPOSIT', 'UPI', 'GST', 'UTILITY', 'SOCIAL', 'TERM_DEPOSIT', 'RECURRING_DEPOSIT', 'MUTUAL_FUNDS', 'SIP'];
    if (params.fiType && !validFiTypes.includes(params.fiType)) {
        errors.push(`fiType must be one of: [${validFiTypes.join(', ')}]`);
    }

    if (params.from && isNaN(new Date(params.from).getTime())) {
        errors.push('from must be a valid ISO 8601 date.');
    }

    if (params.to && isNaN(new Date(params.to).getTime())) {
        errors.push('to must be a valid ISO 8601 date.');
    }

    return { valid: errors.length === 0, errors };
}

module.exports = {
    buildFiRequestPayload,
    validateFiRequestInput,
};
