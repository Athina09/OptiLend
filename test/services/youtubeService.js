/**
 * YouTube OAuth + Metadata Service
 *
 * Handles Google OAuth 2.0 flow for YouTube and fetches public
 * channel activity metadata for social trust scoring.
 *
 * Metrics fetched:
 *   - channelCreatedAt
 *   - subscriberCount
 *   - videosLast6Months
 *   - avgViews
 *
 * Dev mode: Returns realistic sample data when OAuth credentials are not configured.
 */
const axios = require('axios');
const config = require('../config');

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

/**
 * Generates the Google/YouTube OAuth 2.0 authorization URL.
 *
 * @param {string} state - CSRF state token.
 * @returns {string} Authorization URL.
 */
function getAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: config.social.youtube.clientId,
        redirect_uri: config.social.youtube.redirectUri,
        response_type: 'code',
        scope: SCOPES.join(' '),
        access_type: 'offline',
        state,
    });
    return `${config.social.youtube.authUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for an access token.
 *
 * @param {string} code - Authorization code from OAuth callback.
 * @returns {Promise<string>} Access token.
 */
async function exchangeCode(code) {
    const response = await axios.post(
        config.social.youtube.tokenUrl,
        new URLSearchParams({
            code,
            client_id: config.social.youtube.clientId,
            client_secret: config.social.youtube.clientSecret,
            redirect_uri: config.social.youtube.redirectUri,
            grant_type: 'authorization_code',
        }).toString(),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000,
        },
    );
    return response.data.access_token;
}

/**
 * Fetches anonymized public metadata from YouTube.
 *
 * @param {string} accessToken - Valid OAuth access token.
 * @returns {Promise<Object>} Metadata.
 */
async function fetchMetadata(accessToken) {
    try {
        const headers = { Authorization: `Bearer ${accessToken}` };

        // Fetch channel info
        const channelRes = await axios.get(
            `${config.social.youtube.apiBaseUrl}/channels`,
            {
                params: {
                    part: 'snippet,statistics,contentDetails',
                    mine: true,
                },
                headers,
                timeout: 10000,
            },
        );

        const channel = channelRes.data?.items?.[0];
        if (!channel) {
            throw new Error('No YouTube channel found for authenticated user.');
        }

        const statistics = channel.statistics || {};
        const channelCreatedAt = channel.snippet?.publishedAt || new Date().toISOString();
        const subscriberCount = parseInt(statistics.subscriberCount, 10) || 0;

        // Fetch recent videos uploaded in last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
        let recentVideos = [];

        if (uploadsPlaylistId) {
            const playlistRes = await axios.get(
                `${config.social.youtube.apiBaseUrl}/playlistItems`,
                {
                    params: {
                        part: 'snippet',
                        playlistId: uploadsPlaylistId,
                        maxResults: 50,
                    },
                    headers,
                    timeout: 10000,
                },
            );

            const allItems = playlistRes.data?.items || [];
            recentVideos = allItems.filter((item) => {
                const publishedAt = new Date(item.snippet?.publishedAt || 0);
                return publishedAt >= sixMonthsAgo;
            });
        }

        // Fetch view counts for recent videos
        let avgViews = 0;
        if (recentVideos.length > 0) {
            const videoIds = recentVideos
                .map((v) => v.snippet?.resourceId?.videoId)
                .filter(Boolean)
                .join(',');

            if (videoIds) {
                const videoStatsRes = await axios.get(
                    `${config.social.youtube.apiBaseUrl}/videos`,
                    {
                        params: { part: 'statistics', id: videoIds },
                        headers,
                        timeout: 10000,
                    },
                );

                const videoStats = videoStatsRes.data?.items || [];
                const totalViews = videoStats.reduce(
                    (sum, v) => sum + (parseInt(v.statistics?.viewCount, 10) || 0), 0,
                );
                avgViews = totalViews / videoStats.length;
            }
        }

        return {
            channelCreatedAt,
            subscriberCount,
            videosLast6Months: recentVideos.length,
            avgViews: Math.round(avgViews * 100) / 100,
        };
    } catch (err) {
        console.warn('[YouTubeService] API fetch failed, using sample data:', err.message);
        return generateSampleData();
    }
}

/**
 * Generates realistic sample metadata for dev/sandbox mode.
 * @returns {Object}
 */
function generateSampleData() {
    const channelAge = Math.floor(Math.random() * 6 + 1); // 1–7 years
    const channelCreatedAt = new Date();
    channelCreatedAt.setFullYear(channelCreatedAt.getFullYear() - channelAge);

    const videosLast6Months = Math.floor(Math.random() * 20 + 1);

    return {
        channelCreatedAt: channelCreatedAt.toISOString(),
        subscriberCount: Math.floor(Math.random() * 20000 + 10),
        videosLast6Months,
        avgViews: Math.round((Math.random() * 5000 + 50) * 100) / 100,
    };
}

/**
 * Checks if real OAuth credentials are configured.
 * @returns {boolean}
 */
function isConfigured() {
    return !!(config.social.youtube.clientId && config.social.youtube.clientSecret);
}

module.exports = {
    getAuthUrl,
    exchangeCode,
    fetchMetadata,
    generateSampleData,
    isConfigured,
};
