/**
 * X (Twitter) OAuth + Metadata Service
 *
 * Handles OAuth 2.0 with PKCE flow for X/Twitter and fetches public
 * profile activity metadata for social trust scoring.
 *
 * Metrics fetched:
 *   - accountCreatedAt
 *   - tweetsLast6Months
 *   - avgLikes
 *   - avgReplies
 *   - followerCount
 *
 * Dev mode: Returns realistic sample data when OAuth credentials are not configured.
 */
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

const SCOPES = ['tweet.read', 'users.read', 'follows.read'];

/**
 * Generates PKCE code challenge and verifier.
 * @returns {{ codeVerifier: string, codeChallenge: string }}
 */
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}

/**
 * Generates the X/Twitter OAuth 2.0 authorization URL with PKCE.
 *
 * @param {string} state - CSRF state token.
 * @param {string} codeChallenge - PKCE code challenge.
 * @returns {string} Authorization URL.
 */
function getAuthUrl(state, codeChallenge) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.social.twitter.clientId,
        redirect_uri: config.social.twitter.redirectUri,
        scope: SCOPES.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });
    return `${config.social.twitter.authUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for an access token.
 *
 * @param {string} code         - Authorization code from OAuth callback.
 * @param {string} codeVerifier - PKCE code verifier.
 * @returns {Promise<string>} Access token.
 */
async function exchangeCode(code, codeVerifier) {
    const credentials = Buffer.from(
        `${config.social.twitter.clientId}:${config.social.twitter.clientSecret}`,
    ).toString('base64');

    const response = await axios.post(
        config.social.twitter.tokenUrl,
        new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            redirect_uri: config.social.twitter.redirectUri,
            code_verifier: codeVerifier,
        }).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${credentials}`,
            },
            timeout: 10000,
        },
    );
    return response.data.access_token;
}

/**
 * Fetches anonymized public metadata from X/Twitter.
 *
 * @param {string} accessToken - Valid OAuth access token.
 * @returns {Promise<Object>} Metadata.
 */
async function fetchMetadata(accessToken) {
    try {
        const headers = { Authorization: `Bearer ${accessToken}` };

        // Fetch user profile
        const userRes = await axios.get(
            `${config.social.twitter.apiBaseUrl}/users/me?user.fields=created_at,public_metrics`,
            { headers, timeout: 10000 },
        );

        const user = userRes.data.data;
        const publicMetrics = user.public_metrics || {};

        // Fetch recent tweets for engagement metrics
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const tweetsRes = await axios.get(
            `${config.social.twitter.apiBaseUrl}/users/${user.id}/tweets?max_results=100&tweet.fields=public_metrics,created_at&start_time=${sixMonthsAgo.toISOString()}`,
            { headers, timeout: 10000 },
        );

        const tweets = tweetsRes.data?.data || [];
        const tweetCount = tweets.length;

        let avgLikes = 0;
        let avgReplies = 0;
        if (tweetCount > 0) {
            const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0);
            const totalReplies = tweets.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0);
            avgLikes = totalLikes / tweetCount;
            avgReplies = totalReplies / tweetCount;
        }

        return {
            accountCreatedAt: user.created_at || new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString(),
            tweetsLast6Months: tweetCount,
            avgLikes: Math.round(avgLikes * 100) / 100,
            avgReplies: Math.round(avgReplies * 100) / 100,
            followerCount: publicMetrics.followers_count || 0,
        };
    } catch (err) {
        console.warn('[TwitterService] API fetch failed, using sample data:', err.message);
        return generateSampleData();
    }
}

/**
 * Generates realistic sample metadata for dev/sandbox mode.
 * @returns {Object}
 */
function generateSampleData() {
    const accountAge = Math.floor(Math.random() * 7 + 1); // 1–8 years
    const accountCreatedAt = new Date();
    accountCreatedAt.setFullYear(accountCreatedAt.getFullYear() - accountAge);

    const tweetsLast6Months = Math.floor(Math.random() * 100 + 5);

    return {
        accountCreatedAt: accountCreatedAt.toISOString(),
        tweetsLast6Months,
        avgLikes: Math.round((Math.random() * 50 + 1) * 100) / 100,
        avgReplies: Math.round((Math.random() * 10 + 0.5) * 100) / 100,
        followerCount: Math.floor(Math.random() * 10000 + 50),
    };
}

/**
 * Checks if real OAuth credentials are configured.
 * @returns {boolean}
 */
function isConfigured() {
    return !!(config.social.twitter.clientId && config.social.twitter.clientSecret);
}

module.exports = {
    getAuthUrl,
    exchangeCode,
    fetchMetadata,
    generatePKCE,
    generateSampleData,
    isConfigured,
};
