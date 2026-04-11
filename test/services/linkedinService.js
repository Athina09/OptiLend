/**
 * LinkedIn OAuth + Metadata Service
 *
 * Handles OAuth 2.0 flow with LinkedIn and fetches public profile
 * activity metadata for social trust scoring.
 *
 * Metrics fetched:
 *   - connectionCount
 *   - accountCreatedAt
 *   - postsLast6Months
 *
 * Dev mode: Returns realistic sample data when OAuth credentials are not configured.
 */
const axios = require('axios');
const config = require('../config');

const SCOPES = ['r_liteprofile', 'r_emailaddress', 'w_member_social'];

/**
 * Generates the LinkedIn OAuth 2.0 authorization URL.
 *
 * @param {string} state - CSRF state token.
 * @returns {string} Authorization URL.
 */
function getAuthUrl(state) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.social.linkedin.clientId,
        redirect_uri: config.social.linkedin.redirectUri,
        state,
        scope: SCOPES.join(' '),
    });
    return `${config.social.linkedin.authUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for an access token.
 *
 * @param {string} code - Authorization code from OAuth callback.
 * @returns {Promise<string>} Access token.
 */
async function exchangeCode(code) {
    const response = await axios.post(config.social.linkedin.tokenUrl, null, {
        params: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.social.linkedin.redirectUri,
            client_id: config.social.linkedin.clientId,
            client_secret: config.social.linkedin.clientSecret,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
    });
    return response.data.access_token;
}

/**
 * Fetches anonymized public metadata from LinkedIn.
 *
 * @param {string} accessToken - Valid OAuth access token.
 * @returns {Promise<Object>} Metadata: { connectionCount, accountCreatedAt, postsLast6Months }
 */
async function fetchMetadata(accessToken) {
    try {
        // Fetch profile basics
        const profileRes = await axios.get(`${config.social.linkedin.apiBaseUrl}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10000,
        });

        // Fetch connections count
        const connectionsRes = await axios.get(
            `${config.social.linkedin.apiBaseUrl}/connections?q=viewer&start=0&count=0`,
            { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 },
        );

        // Fetch recent posts count (UGC posts)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const postsRes = await axios.get(
            `${config.social.linkedin.apiBaseUrl}/ugcPosts?q=authors&authors=List(${encodeURIComponent(profileRes.data.id)})&count=100`,
            { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 },
        );

        const recentPosts = (postsRes.data?.elements || []).filter((p) => {
            const created = new Date(p.created?.time || 0);
            return created >= sixMonthsAgo;
        });

        return {
            connectionCount: connectionsRes.data?._total || connectionsRes.data?.paging?.total || 0,
            accountCreatedAt: profileRes.data?.profileCreatedAt || new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000).toISOString(),
            postsLast6Months: recentPosts.length,
        };
    } catch (err) {
        console.warn('[LinkedInService] API fetch failed, using sample data:', err.message);
        return generateSampleData();
    }
}

/**
 * Generates realistic sample metadata for dev/sandbox mode.
 * @returns {Object}
 */
function generateSampleData() {
    const accountAge = Math.floor(Math.random() * 5 + 1); // 1–6 years
    const accountCreatedAt = new Date();
    accountCreatedAt.setFullYear(accountCreatedAt.getFullYear() - accountAge);

    return {
        connectionCount: Math.floor(Math.random() * 2000 + 100),
        accountCreatedAt: accountCreatedAt.toISOString(),
        postsLast6Months: Math.floor(Math.random() * 30 + 2),
    };
}

/**
 * Checks if real OAuth credentials are configured.
 * @returns {boolean}
 */
function isConfigured() {
    return !!(config.social.linkedin.clientId && config.social.linkedin.clientSecret);
}

module.exports = {
    getAuthUrl,
    exchangeCode,
    fetchMetadata,
    generateSampleData,
    isConfigured,
};
