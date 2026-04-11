/**
 * XML Builder — UIDAI Auth API v2.5
 *
 * Generates PID XML blocks and full Auth XML envelopes
 * compliant with the UIDAI Authentication API specification.
 */

/**
 * Returns the current timestamp in ISO 8601 format used by UIDAI.
 * Format: YYYY-MM-DDTHH:mm:ss+05:30 (IST timezone)
 */
function getISTTimestamp() {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffsetMs);

    const pad = (n) => String(n).padStart(2, '0');
    const y = istDate.getUTCFullYear();
    const m = pad(istDate.getUTCMonth() + 1);
    const d = pad(istDate.getUTCDate());
    const hh = pad(istDate.getUTCHours());
    const mm = pad(istDate.getUTCMinutes());
    const ss = pad(istDate.getUTCSeconds());

    return `${y}-${m}-${d}T${hh}:${mm}:${ss}+05:30`;
}

/**
 * Builds the PID XML block for OTP authentication.
 *
 * @param {string} otp - The OTP value (empty string for initiation request).
 * @returns {string} PID XML string.
 *
 * UIDAI PID v2.0 structure:
 * <Pid ts="..." ver="2.0" wadh="">
 *   <Pv otp="123456"/>
 * </Pid>
 */
function buildPidXml(otp = '') {
    const timestamp = getISTTimestamp();

    const pidXml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<Pid ts="${timestamp}" ver="2.0" wadh="">`,
        `  <Pv otp="${escapeXml(otp)}"/>`,
        `</Pid>`,
    ].join('\n');

    return pidXml;
}

/**
 * Builds the full Auth XML envelope per UIDAI Auth API v2.5.
 *
 * @param {Object} params
 * @param {string} params.uid           - 12-digit Aadhaar number.
 * @param {string} params.txnId         - Unique transaction ID (UUID).
 * @param {string} params.auaCode       - AUA code.
 * @param {string} params.subAuaCode    - Sub-AUA code.
 * @param {string} params.licenseKey    - ASA license key.
 * @param {string} params.encryptedPid  - Base64-encoded encrypted PID.
 * @param {string} params.encSessionKey - Base64-encoded encrypted session key.
 * @param {string} params.hmac          - Base64-encoded HMAC of PID.
 * @param {string} params.iv            - Base64-encoded IV used for encryption.
 * @returns {string} Full Auth XML string.
 */
function buildAuthXml({
    uid,
    txnId,
    auaCode,
    subAuaCode,
    licenseKey,
    encryptedPid,
    encSessionKey,
    hmac,
    iv,
}) {
    const timestamp = getISTTimestamp();

    const authXml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<Auth uid="${escapeXml(uid)}"`,
        `  tid="public"`,
        `  ac="${escapeXml(auaCode)}"`,
        `  sa="${escapeXml(subAuaCode)}"`,
        `  ver="2.5"`,
        `  txn="${escapeXml(txnId)}"`,
        `  lk="${escapeXml(licenseKey)}"`,
        `  rc="Y">`,
        `  <Uses pi="n" pa="n" pfa="n" bio="n" bt="n" pin="n" otp="y"/>`,
        `  <Tkn type="001" value=""/>`,
        `  <Meta udc="AADHAAR_OTP_AUTH" fdc="" idc="" pip="" lot="P" lov=""/>`,
        `  <Skey ci="${timestamp}">${escapeXml(encSessionKey)}</Skey>`,
        `  <Hmac>${escapeXml(hmac)}</Hmac>`,
        `  <Data type="X">${escapeXml(encryptedPid)}</Data>`,
        `</Auth>`,
    ].join('\n');

    return authXml;
}

/**
 * Escapes special XML characters to prevent injection.
 *
 * @param {string} str - Raw string.
 * @returns {string} XML-safe string.
 */
function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

module.exports = {
    buildPidXml,
    buildAuthXml,
    getISTTimestamp,
    escapeXml,
};
