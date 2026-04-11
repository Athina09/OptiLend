/**
 * Consent Service
 *
 * Business logic for creating, retrieving, and revoking
 * Account Aggregator consent artefacts per ReBIT AA API v2.0.
 */
const { generateConsentId, isValidUuid } = require('../utils/uuidGenerator');
const consentModel = require('../models/consentModel');

// ─── Constants ─────────────────────────────────────────────────────

const VALID_FI_TYPES = ['DEPOSIT', 'UPI', 'GST', 'UTILITY', 'SOCIAL'];
const VALID_DATA_LIFE_UNITS = ['MONTH', 'YEAR', 'DAY', 'INF'];
const VALID_STATUSES = ['ACTIVE', 'REVOKED', 'PAUSED', 'EXPIRED'];

// ─── In-Memory Fallback (when PostgreSQL is unavailable) ───────────

let memoryStore = [];
let useMemory = false;

// ─── Initialization ───────────────────────────────────────────────

/**
 * Initializes the consent storage (tries PostgreSQL, falls back to memory).
 */
async function init() {
    const dbReady = await consentModel.initTable();
    if (!dbReady) {
        useMemory = true;
        console.warn('[ConsentService] PostgreSQL unavailable — using in-memory store (dev mode).');
    }
}

// ─── Validation ───────────────────────────────────────────────────

/**
 * Validates the consent creation request payload.
 *
 * @param {Object} payload
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateConsentPayload(payload) {
    const errors = [];

    // User reference ID
    if (!payload.userReferenceId || typeof payload.userReferenceId !== 'string') {
        errors.push('userReferenceId is required and must be a string.');
    }

    // FI Types
    if (!payload.fiTypes || !Array.isArray(payload.fiTypes) || payload.fiTypes.length === 0) {
        errors.push('fiTypes is required and must be a non-empty array.');
    } else {
        const invalid = payload.fiTypes.filter((t) => !VALID_FI_TYPES.includes(t));
        if (invalid.length > 0) {
            errors.push(`Invalid fiTypes: [${invalid.join(', ')}]. Valid: [${VALID_FI_TYPES.join(', ')}]`);
        }
    }

    // Data Range
    if (!payload.dataRange || typeof payload.dataRange !== 'object') {
        errors.push('dataRange is required and must be an object with { from, to }.');
    } else {
        if (!payload.dataRange.from) errors.push('dataRange.from is required (ISO 8601 date).');
        if (!payload.dataRange.to) errors.push('dataRange.to is required (ISO 8601 date).');
        if (payload.dataRange.from && payload.dataRange.to) {
            const from = new Date(payload.dataRange.from);
            const to = new Date(payload.dataRange.to);
            if (isNaN(from.getTime())) errors.push('dataRange.from is not a valid date.');
            if (isNaN(to.getTime())) errors.push('dataRange.to is not a valid date.');
            if (from >= to) errors.push('dataRange.from must be before dataRange.to.');
        }
    }

    // Data Life
    if (!payload.dataLife || typeof payload.dataLife !== 'object') {
        errors.push('dataLife is required and must be an object with { unit, value }.');
    } else {
        if (!payload.dataLife.unit || !VALID_DATA_LIFE_UNITS.includes(payload.dataLife.unit)) {
            errors.push(`dataLife.unit must be one of: [${VALID_DATA_LIFE_UNITS.join(', ')}]`);
        }
        if (payload.dataLife.value === undefined || typeof payload.dataLife.value !== 'number' || payload.dataLife.value < 0) {
            errors.push('dataLife.value is required and must be a non-negative number.');
        }
    }

    return { valid: errors.length === 0, errors };
}

// ─── Create Consent ───────────────────────────────────────────────

/**
 * Creates a new consent artefact per ReBIT AA API v2.0 structure.
 *
 * @param {Object} payload - Request body from controller.
 * @returns {Promise<{ success: boolean, data?: Object, message: string, errors?: string[] }>}
 */
async function createConsent(payload) {
    // Validate
    const validation = validateConsentPayload(payload);
    if (!validation.valid) {
        return {
            success: false,
            message: 'Validation failed.',
            errors: validation.errors,
        };
    }

    const consentId = generateConsentId();
    const now = new Date().toISOString();

    // Build ReBIT AA API v2.0 compliant consent artefact
    const consentArtefact = {
        ver: '2.0',
        txnid: generateConsentId(), // unique transaction ID
        consentId,
        status: 'ACTIVE',
        createTimestamp: now,
        signedConsent: '', // Would be digitally signed in production
        ConsentUse: {
            logUri: '',
            count: 1,
            lastUseDateTime: now,
        },
        Purpose: payload.purpose || {
            code: '101',
            refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
            text: 'Wealth management service',
            Category: { type: 'string' },
        },
        FIDataRange: {
            from: payload.dataRange.from,
            to: payload.dataRange.to,
        },
        DataConsumer: {
            id: payload.dataConsumerId || 'DC001',
            type: 'FIU',
        },
        DataProvider: {
            id: payload.dataProviderId || 'DP001',
            type: 'FIP',
        },
        Customer: {
            id: payload.userReferenceId,
        },
        Accounts: payload.fiTypes.map((type) => ({
            fiType: type,
            fipId: payload.dataProviderId || 'DP001',
            accType: type,
            linkRefNumber: generateConsentId(),
            maskedAccNumber: 'XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000),
        })),
        DataLife: {
            unit: payload.dataLife.unit,
            value: payload.dataLife.value,
        },
        Frequency: payload.frequency || {
            unit: 'MONTH',
            value: 1,
        },
        DataFilter: payload.dataFilter || [],
    };

    // Prepare record
    const record = {
        consentId,
        userReferenceId: payload.userReferenceId,
        status: 'ACTIVE',
        fiTypes: payload.fiTypes,
        dataRange: payload.dataRange,
        dataLife: payload.dataLife,
        purpose: consentArtefact.Purpose,
        consentArtefact,
        createdAt: now,
    };

    // Store in PostgreSQL or memory
    if (useMemory) {
        memoryStore.push(record);
        console.log(`[ConsentService] Consent ${consentId} stored in memory (dev mode).`);
    } else {
        try {
            await consentModel.insertConsent(record);
            console.log(`[ConsentService] Consent ${consentId} stored in PostgreSQL.`);
        } catch (err) {
            console.error('[ConsentService] DB insert failed, falling back to memory:', err.message);
            memoryStore.push(record);
            useMemory = true;
        }
    }

    return {
        success: true,
        message: 'Consent artefact created successfully.',
        data: {
            consentId,
            status: 'ACTIVE',
            createdAt: now,
            consentArtefact,
        },
    };
}

// ─── Get Consent ──────────────────────────────────────────────────

/**
 * Retrieves a consent artefact by ID.
 */
async function getConsent(consentId) {
    if (!isValidUuid(consentId)) {
        return { success: false, message: 'Invalid consentId format.' };
    }

    let record = null;

    if (useMemory) {
        record = memoryStore.find((c) => c.consentId === consentId) || null;
    } else {
        try {
            record = await consentModel.getConsentById(consentId);
        } catch (err) {
            console.error('[ConsentService] DB query failed:', err.message);
            record = memoryStore.find((c) => c.consentId === consentId) || null;
        }
    }

    if (!record) {
        return { success: false, message: 'Consent artefact not found.' };
    }

    return { success: true, data: record };
}

// ─── Get User Consents ────────────────────────────────────────────

/**
 * Retrieves all consent artefacts for a user.
 */
async function getUserConsents(userReferenceId) {
    if (!userReferenceId) {
        return { success: false, message: 'userReferenceId is required.' };
    }

    let records = [];

    if (useMemory) {
        records = memoryStore.filter((c) => c.userReferenceId === userReferenceId);
    } else {
        try {
            records = await consentModel.getConsentsByUser(userReferenceId);
        } catch (err) {
            console.error('[ConsentService] DB query failed:', err.message);
            records = memoryStore.filter((c) => c.userReferenceId === userReferenceId);
        }
    }

    return { success: true, data: records, count: records.length };
}

// ─── Revoke Consent ───────────────────────────────────────────────

/**
 * Revokes a consent artefact.
 */
async function revokeConsent(consentId) {
    if (!isValidUuid(consentId)) {
        return { success: false, message: 'Invalid consentId format.' };
    }

    if (useMemory) {
        const idx = memoryStore.findIndex(
            (c) => c.consentId === consentId && c.status === 'ACTIVE',
        );
        if (idx === -1) {
            return { success: false, message: 'Active consent artefact not found.' };
        }
        memoryStore[idx].status = 'REVOKED';
        memoryStore[idx].revokedAt = new Date().toISOString();
        console.log(`[ConsentService] Consent ${consentId} revoked (memory).`);
        return {
            success: true,
            message: 'Consent revoked successfully.',
            data: memoryStore[idx],
        };
    }

    try {
        const revoked = await consentModel.revokeConsent(consentId);
        if (!revoked) {
            return { success: false, message: 'Active consent artefact not found.' };
        }
        console.log(`[ConsentService] Consent ${consentId} revoked (PostgreSQL).`);
        return {
            success: true,
            message: 'Consent revoked successfully.',
            data: revoked,
        };
    } catch (err) {
        console.error('[ConsentService] DB revoke failed:', err.message);
        return { success: false, message: 'Failed to revoke consent.' };
    }
}

module.exports = {
    init,
    createConsent,
    getConsent,
    getUserConsents,
    revokeConsent,
    validateConsentPayload,
};
