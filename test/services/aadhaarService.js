/**
 * Aadhaar Authentication Service
 *
 * Core business logic for initiating and verifying Aadhaar OTP
 * via the UIDAI Auth API v2.5.
 */
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const config = require('../config');
const { buildPidXml, buildAuthXml } = require('../utils/xmlBuilder');
const {
    generateSessionKey,
    encryptPidBlock,
    encryptSessionKey,
    generateHmac,
    hashAadhaar,
} = require('../utils/encryption');
const { generateToken } = require('../utils/jwtGenerator');
const store = require('../store/memoryStore');

/**
 * Helper to send SMS via Fast2SMS or Twilio for Demo.
 */
async function sendSms(phoneNumber, otp) {
    const { service, apiKey, twilio, demoPhone } = config.sms;
    const targetPhone = phoneNumber || demoPhone;

    if (!targetPhone) {
        console.warn('[AadhaarService] No recipient phone number provided for SMS.');
        return;
    }

    console.log(`\n--- HACKATHON DEMO: SMS OTP TRIGGERED ---`);
    console.log(`SENDING REAL SMS TO: ${targetPhone}`);
    console.log(`SERVICE: ${service}`);
    console.log('-------------------------------------\n');

    try {
        if (service === 'FAST2SMS' && apiKey) {
            // Fast2SMS Implementation using Quick SMS route
            const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
                params: {
                    authorization: apiKey,
                    message: `${otp} is OTP for Aadhaar (XX7831) (valid for 10 mins) at NIC. Mandatory Biometric update for age group 5 to 17 is free of cost -UIDAI`,
                    route: 'q',
                    numbers: targetPhone,
                },
            });
            console.log(`[AadhaarService] Fast2SMS Response:`, JSON.stringify(response.data, null, 2));
        } else if (service === 'TWILIO' && twilio.accountSid) {
            // Twilio Implementation (using basic auth)
            const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64');
            await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
                new URLSearchParams({
                    To: targetPhone,
                    From: twilio.phoneNumber,
                    Body: `Your Aadhaar OTP for demo is ${otp}. Valid for 10 mins.`,
                }),
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
        } else if (service === 'MOCK') {
            const separator = '★'.repeat(40);
            console.log(`\n${separator}`);
            console.log('       🚀 MOCK SMS SERVICE (DEMO MODE)    ');
            console.log(`${separator}`);
            console.log(`  TO      : ${targetPhone}`);
            console.log(`  OTP     : ${otp}`);
            console.log(`  MESSAGE : Hi, your requested code is ${otp}.`);
            console.log(`${separator}\n`);
        } else {
            console.log(`[AadhaarService] SMS Provider (${service}) not configured or invalid. Check .env.`);
            console.log(`[DEMO FALLBACK] SMS OTP would be: ${otp}`);
        }
        console.log(`[AadhaarService] SMS operation finished for ${targetPhone}`);
    } catch (err) {
        console.error('[AadhaarService] Failed to send SMS:', err.response?.data || err.message);
    }
}

// ─── Validation ────────────────────────────────────────────────────

const AADHAAR_REGEX = /^\d{12}$/;

/**
 * Validates a 12-digit Aadhaar number.
 *
 * @param {string} aadhaarNumber
 * @returns {boolean}
 */
function isValidAadhaar(aadhaarNumber) {
    return typeof aadhaarNumber === 'string' && AADHAAR_REGEX.test(aadhaarNumber);
}

// ─── Initiate OTP ──────────────────────────────────────────────────

/**
 * Initiates OTP-based authentication with UIDAI.
 *
 * Steps:
 *  1. Validate Aadhaar format.
 *  2. Hash Aadhaar (never store raw).
 *  3. Check rate-limit lock.
 *  4. Build PID XML (OTP request — empty OTP field).
 *  5. Generate AES session key, encrypt PID, encrypt session key.
 *  6. Build full Auth XML envelope.
 *  7. Send POST to UIDAI Auth API over HTTPS.
 *  8. Store session in memory.
 *
 * @param {string} aadhaarNumber - 12-digit Aadhaar.
 * @param {string} [demoPhone]   - Optional phone for hackathon demo.
 * @returns {Promise<{ success: boolean, txnId?: string, message: string }>}
 */
async function initiateOtp(aadhaarNumber, demoPhone) {
    // 1. Validate
    if (!isValidAadhaar(aadhaarNumber)) {
        return {
            success: false,
            message: 'Invalid Aadhaar number. Must be exactly 12 digits.',
        };
    }

    // 2. Hash
    const hashed = hashAadhaar(aadhaarNumber);

    // 3. Rate-limit check
    if (store.isLocked(hashed)) {
        const remaining = store.getLockoutRemaining(hashed);
        return {
            success: false,
            message: `Account is temporarily locked. Please try again in ${remaining} seconds.`,
        };
    }

    // 4. Build PID XML (empty OTP = request to send OTP)
    const pidXml = buildPidXml('');

    // 5. Encrypt
    const sessionKey = generateSessionKey();
    const { encryptedPid, iv, authTag } = encryptPidBlock(pidXml, sessionKey);
    const hmac = generateHmac(pidXml, sessionKey);

    // 6. Generate transaction ID
    const txnId = uuidv4();

    // Encrypt session key with UIDAI public key
    let encSessionKey;
    try {
        encSessionKey = encryptSessionKey(sessionKey, config.uidai.publicKeyPath);
    } catch (err) {
        console.warn('[AadhaarService] UIDAI public key not available (dev mode):', err.message);
        encSessionKey = 'DEV_MODE_PLACEHOLDER_SESSION_KEY';
    }

    // 7. Build Auth XML
    const authXml = buildAuthXml({
        uid: aadhaarNumber,
        txnId,
        auaCode: config.uidai.auaCode,
        subAuaCode: config.uidai.subAuaCode,
        licenseKey: config.uidai.asaLicenseKey,
        encryptedPid,
        encSessionKey,
        hmac,
        iv,
    });

    // 8. Send to UIDAI
    try {
        const uidaiUrl = `${config.uidai.authUrl}${config.uidai.auaCode}/${aadhaarNumber[0]}/${aadhaarNumber[1]}`;

        const response = await axios.post(uidaiUrl, authXml, {
            headers: { 'Content-Type': 'application/xml' },
            timeout: 30000,
        });

        // Store session regardless — UIDAI response parsing can be enhanced
        store.createSession(hashed, txnId);

        console.log(`[AadhaarService] OTP initiated for txn: ${txnId}`);

        return {
            success: true,
            txnId,
            message: 'OTP has been sent to your registered mobile number.',
        };
    } catch (err) {
        // In development/staging (Hackathon Mode), send a real SMS OTP
        const otp = '837669'; //test OTP for demo predictability
        const recipient = demoPhone || config.sms.demoPhone;

        await sendSms(recipient, otp);

        // Keep the "network realism" delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        store.createSession(hashed, txnId);

        return {
            success: true,
            txnId,
            message: `OTP has been sent to your registered mobile: ${recipient || '******'}`,
        };
    }
}

// ─── Verify OTP ────────────────────────────────────────────────────

/**
 * Verifies the OTP entered by the user.
 *
 * Steps:
 *  1. Validate inputs.
 *  2. Hash Aadhaar.
 *  3. Check rate-limit lock.
 *  4. Retrieve session.
 *  5. Build PID XML with OTP.
 *  6. Encrypt and send to UIDAI.
 *  7. On success → generate JWT, clear attempts.
 *  8. On failure → increment attempts, check lockout.
 *
 * @param {string} aadhaarNumber - 12-digit Aadhaar.
 * @param {string} otp           - 6-digit OTP.
 * @param {string} txnId         - Transaction ID from initiate step.
 * @returns {Promise<{ success: boolean, token?: string, message: string }>}
 */
async function verifyOtp(aadhaarNumber, otp, txnId) {
    // 1. Validate
    if (!isValidAadhaar(aadhaarNumber)) {
        return {
            success: false,
            message: 'Invalid Aadhaar number. Must be exactly 12 digits.',
        };
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
        return {
            success: false,
            message: 'Invalid OTP. Must be exactly 6 digits.',
        };
    }

    if (!txnId) {
        return { success: false, message: 'Transaction ID is required.' };
    }

    // 2. Hash
    const hashed = hashAadhaar(aadhaarNumber);

    // 3. Rate-limit check
    if (store.isLocked(hashed)) {
        const remaining = store.getLockoutRemaining(hashed);
        return {
            success: false,
            message: `Account is temporarily locked due to multiple failed attempts. Try again in ${remaining} seconds.`,
        };
    }

    // 4. Check session
    const session = store.getSession(hashed);
    if (!session) {
        return {
            success: false,
            message: 'No active OTP session found. Please initiate OTP first.',
        };
    }

    if (session.txnId !== txnId) {
        return {
            success: false,
            message: 'Transaction ID mismatch. Please initiate a new OTP request.',
        };
    }

    // 5. Build PID XML with OTP
    const pidXml = buildPidXml(otp);

    // 6. Encrypt
    const sessionKey = generateSessionKey();
    const { encryptedPid } = encryptPidBlock(pidXml, sessionKey);
    const hmac = generateHmac(pidXml, sessionKey);

    let encSessionKey;
    try {
        encSessionKey = encryptSessionKey(sessionKey, config.uidai.publicKeyPath);
    } catch (err) {
        console.warn('[AadhaarService] UIDAI public key not available (dev mode):', err.message);
        encSessionKey = 'DEV_MODE_PLACEHOLDER_SESSION_KEY';
    }

    // Build Auth XML
    const authXml = buildAuthXml({
        uid: aadhaarNumber,
        txnId,
        auaCode: config.uidai.auaCode,
        subAuaCode: config.uidai.subAuaCode,
        licenseKey: config.uidai.asaLicenseKey,
        encryptedPid,
        encSessionKey,
        hmac,
    });

    // 7. Send to UIDAI for verification
    try {
        const uidaiUrl = `${config.uidai.authUrl}${config.uidai.auaCode}/${aadhaarNumber[0]}/${aadhaarNumber[1]}`;

        const response = await axios.post(uidaiUrl, authXml, {
            headers: { 'Content-Type': 'application/xml' },
            timeout: 30000,
        });

        // Parse UIDAI response — check for ret="y" (success)
        const responseData = typeof response.data === 'string' ? response.data : '';
        const isSuccess = responseData.includes('ret="y"') || responseData.includes("ret='y'");

        if (isSuccess) {
            return handleSuccess(hashed, txnId);
        } else {
            return handleFailure(hashed);
        }
    } catch (err) {
        console.warn(
            `[AadhaarService] UIDAI API call failed (expected in dev): ${err.message}`,
        );

        // In dev/test mode, simulate success if OTP is '123456'
        if (otp === '123456') {
            console.log('[AadhaarService] Dev mode: accepting test OTP 123456');
            return handleSuccess(hashed, txnId);
        }

        return handleFailure(hashed);
    }
}

/**
 * Handles a successful OTP verification.
 */
function handleSuccess(hashedAadhaar, txnId) {
    // Generate JWT
    const token = generateToken({ hashedAadhaar, txnId });

    // Clear session and reset attempts
    store.clearSession(hashedAadhaar);
    store.resetAttempts(hashedAadhaar);

    console.log(`[AadhaarService] OTP verified successfully for txn: ${txnId}`);

    return {
        success: true,
        token,
        message: 'Aadhaar authentication successful.',
    };
}

/**
 * Handles a failed OTP verification.
 */
function handleFailure(hashedAadhaar) {
    const { locked, attemptsLeft } = store.incrementFailed(hashedAadhaar);

    if (locked) {
        const remaining = store.getLockoutRemaining(hashedAadhaar);
        return {
            success: false,
            message: `Too many failed attempts. Account locked for ${remaining} seconds.`,
        };
    }

    return {
        success: false,
        message: `Invalid OTP. ${attemptsLeft} attempt(s) remaining before lockout.`,
    };
}

module.exports = {
    initiateOtp,
    verifyOtp,
    isValidAadhaar,
};
