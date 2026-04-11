/**
 * Business verification (GSTIN / Udyam / PAN) — MVP mock OTP + mock registry checks.
 */
const { generateBusinessVerificationToken } = require('../utils/jwtGenerator');

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const UDYAM_FULL_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i;

/** In-memory pending OTP sessions (normalized business id → timestamp) */
const pendingSessions = new Map();

const MOCK_OTP = '123456';

function normalizeBusinessId(raw) {
    return String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
}

/**
 * @param {string} raw
 * @returns {{ ok: boolean, type?: string, normalized?: string, message?: string }}
 */
function validateBusinessId(raw) {
    const s = normalizeBusinessId(raw);
    if (!s) {
        return { ok: false, message: 'Business ID is required.' };
    }
    if (s.length === 10 && PAN_REGEX.test(s)) {
        return { ok: true, type: 'pan', normalized: s };
    }
    if (s.length === 15 && GSTIN_REGEX.test(s)) {
        return { ok: true, type: 'gstin', normalized: s };
    }
    if (UDYAM_FULL_REGEX.test(s)) {
        return { ok: true, type: 'udyam', normalized: s };
    }
    if (/^[A-Z0-9-]{12,25}$/.test(s)) {
        return { ok: true, type: 'udyam', normalized: s };
    }
    return {
        ok: false,
        message:
            'Enter a valid GSTIN (15 characters), PAN (10 characters), or Udyam registration number.',
    };
}

/**
 * Demo display name tied to the ID the user entered (no placeholder fake company like "ABC Enterprises").
 * @param {string} normalized
 * @param {string} type - gstin | pan | udyam
 */
function mockBusinessPayload(normalized, type) {
    let business_name;
    if (type === 'gstin' && normalized.length === 15) {
        business_name = `GST-registered MSME · ${normalized.slice(0, 2)}···${normalized.slice(-4)}`;
    } else if (type === 'pan' && normalized.length === 10) {
        business_name = `PAN-linked profile · ${normalized.slice(0, 3)}···${normalized.slice(-2)}`;
    } else {
        business_name = 'Udyam-registered MSME';
    }
    return {
        gst_status: 'active',
        udyam_status: 'registered',
        pan_linked: true,
        business_name,
    };
}

/**
 * POST /send-otp body: { business_id }
 */
function sendOtp(businessIdRaw) {
    const v = validateBusinessId(businessIdRaw);
    if (!v.ok) {
        return { success: false, message: v.message };
    }
    pendingSessions.set(v.normalized, Date.now());
    return {
        success: true,
        message: 'OTP sent to the registered mobile for this business (demo: use 123456).',
        demo_otp: MOCK_OTP,
    };
}

/**
 * POST /verify-otp body: { business_id, otp }
 */
function verifyOtp(businessIdRaw, otp) {
    const v = validateBusinessId(businessIdRaw);
    if (!v.ok) {
        return { success: false, message: v.message };
    }
    if (!pendingSessions.has(v.normalized)) {
        return {
            success: false,
            message: 'No active OTP session. Request OTP first.',
        };
    }
    const cleanOtp = String(otp || '').replace(/\D/g, '');
    if (cleanOtp !== MOCK_OTP) {
        return { success: false, message: 'Invalid OTP. Try again.' };
    }

    pendingSessions.delete(v.normalized);
    const mock = mockBusinessPayload(v.normalized, v.type);
    const token = generateBusinessVerificationToken({
        businessId: v.normalized,
        idType: v.type,
        businessName: mock.business_name,
    });

    return {
        success: true,
        verified: true,
        business_name: mock.business_name,
        checks: {
            gst: mock.gst_status === 'active',
            udyam: mock.udyam_status === 'registered',
            pan: mock.pan_linked === true,
        },
        token,
        message: 'Business verified successfully.',
    };
}

module.exports = {
    validateBusinessId,
    sendOtp,
    verifyOtp,
    MOCK_OTP,
};
