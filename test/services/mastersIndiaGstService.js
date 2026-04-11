/**
 * Masters India GST API — docs: https://docs.mastersindia.co/goods-and-services-tax-gst-api/
 *
 * - GET  get-gstr-data-api — fetch GSTR1/GSTR2A/etc. for a GSTIN + period
 * - POST upload_gstr3b/     — body matches official GSTR-3B JSON (headers: gstin, month, year, Authorization)
 * - POST upload-gstr1/      — GSTR-1 JSON (headers: gstin, month, year, invoice, summary)
 */
const axios = require('axios');
const config = require('../config');

let cachedJwtFromPassword = null;

function staticJwtHeaders() {
    const jwt = config.mastersIndia.jwt;
    if (!jwt) return null;
    const auth = jwt.trim().startsWith('JWT ') ? jwt.trim() : `JWT ${jwt.trim()}`;
    return { Authorization: auth };
}

function normalizeMonth(m) {
    const n = parseInt(String(m), 10);
    if (Number.isNaN(n) || n < 1 || n > 12) return null;
    return String(n).padStart(2, '0');
}

/**
 * Previous calendar month + Indian financial year label (Apr–Mar), e.g. { month: '06', year: '2024-25' }.
 */
function getDefaultIndianGstPeriod(referenceDate = new Date()) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - 1);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const calMonth = d.getMonth() + 1;
    const y = d.getFullYear();
    const fyStart = calMonth >= 4 ? y : y - 1;
    const fyEndShort = (fyStart + 1) % 100;
    const financialYear = `${fyStart}-${String(fyEndShort).padStart(2, '0')}`;
    return { month, year: financialYear };
}

async function fetchJwtWithCredentials() {
    const { username, password, baseUrl } = config.mastersIndia;
    if (!username || !password) {
        return { token: null, error: 'Set MASTERS_INDIA_USERNAME and MASTERS_INDIA_PASSWORD (or MASTERS_INDIA_JWT).' };
    }
    const url = `${baseUrl.replace(/\/$/, '')}/token-auth/`;
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    const res = await axios.post(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 25000,
    });
    const token =
        res.data?.token ||
        res.data?.access ||
        res.data?.access_token ||
        res.data?.jwt ||
        res.data?.data?.token;
    return { token, raw: res.data };
}

async function getAuthorizationHeader() {
    const direct = staticJwtHeaders();
    if (direct) return direct;
    if (cachedJwtFromPassword) return cachedJwtFromPassword;
    const { token, error } = await fetchJwtWithCredentials();
    if (!token) {
        throw new Error(error || 'Could not obtain Masters India JWT.');
    }
    const auth = token.trim().startsWith('JWT ') ? token.trim() : `JWT ${token.trim()}`;
    cachedJwtFromPassword = { Authorization: auth };
    return cachedJwtFromPassword;
}

/**
 * GET get-gstr-data — headers per docs: Gstin, Year, Month, Authorization, productId
 */
async function getGstrData({
    gstin,
    month,
    year,
    dataType = 'GSTR1',
    pageSize = 10,
    search = '',
}) {
    try {
        const auth = await getAuthorizationHeader();
        const base = config.mastersIndia.baseUrl.replace(/\/$/, '');
        const url = `${base}/saas-apis/get-gstr-data-api/`;
        const mm = normalizeMonth(month);
        if (!mm) {
            return { success: false, message: 'Invalid month (use 1–12).' };
        }
        const res = await axios.get(url, {
            params: {
                search: search || '',
                data_type: dataType,
                page_size: pageSize,
            },
            headers: {
                ...auth,
                Gstin: gstin,
                Year: year,
                Month: mm,
                productId: config.mastersIndia.productId,
            },
            timeout: 60000,
        });
        const payload = res.data;
        const d = payload?.data;
        const hasRecords =
            d &&
            typeof d === 'object' &&
            Object.keys(d).some((k) => Array.isArray(d[k]) && d[k].length > 0);
        return {
            success: !!payload?.success,
            data: payload,
            hasRecords,
            status: res.status,
        };
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        return {
            success: false,
            message: data?.message || data?.detail || err.message,
            status,
            body: data,
        };
    }
}

/**
 * POST upload_gstr3b/ — JSON body as in Masters India docs; headers gstin, month, year, Authorization
 */
async function uploadGstr3b({ gstin, month, year, payload }) {
    try {
        const auth = await getAuthorizationHeader();
        const mm = normalizeMonth(month);
        if (!mm) {
            return { success: false, message: 'Invalid month (use 1–12).' };
        }
        const base = config.mastersIndia.baseUrl.replace(/\/$/, '');
        const url = `${base}/saas-apis/upload_gstr3b/`;
        const res = await axios.post(url, payload, {
            headers: {
                ...auth,
                gstin,
                month: mm,
                year,
                'Content-Type': 'application/json',
            },
            timeout: 120000,
        });
        return { success: true, data: res.data, status: res.status };
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        return {
            success: false,
            message: data?.message || data?.detail || err.message,
            status,
            body: data,
        };
    }
}

/**
 * POST upload-gstr1/ — optional headers invoice, summary (docs default Y / y)
 */
async function uploadGstr1({ gstin, month, year, payload, invoice = 'Y', summary = 'y' }) {
    try {
        const auth = await getAuthorizationHeader();
        const mm = normalizeMonth(month);
        if (!mm) {
            return { success: false, message: 'Invalid month (use 1–12).' };
        }
        const base = config.mastersIndia.baseUrl.replace(/\/$/, '');
        const url = `${base}/saas-apis/upload-gstr1/`;
        const res = await axios.post(url, payload, {
            headers: {
                ...auth,
                gstin,
                month: mm,
                year,
                invoice,
                summary,
                'Content-Type': 'application/json',
            },
            timeout: 120000,
        });
        return { success: true, data: res.data, status: res.status };
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        return {
            success: false,
            message: data?.message || data?.detail || err.message,
            status,
            body: data,
        };
    }
}

function clearCachedToken() {
    cachedJwtFromPassword = null;
}

module.exports = {
    getDefaultIndianGstPeriod,
    normalizeMonth,
    getGstrData,
    uploadGstr3b,
    uploadGstr1,
    fetchJwtWithCredentials,
    clearCachedToken,
};
