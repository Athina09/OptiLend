/**
 * Social Trust Score Controller
 *
 * Express route handlers for the social trust scoring API.
 * Accepts profile URLs, orchestrates OAuth + metadata fetch,
 * and returns anonymized social score.
 */
const socialService = require('../services/socialService');

/**
 * POST /social/connect
 *
 * Accepts profile URLs for LinkedIn, X, Instagram, YouTube.
 * Fetches public activity metadata and returns a social trust score.
 *
 * Request Body:
 * {
 *   "profileUrls": {
 *     "linkedin": "https://linkedin.com/in/username",       // optional
 *     "twitter": "https://x.com/username",                  // optional
 *     "instagram": "https://instagram.com/username",        // optional
 *     "youtube": "https://youtube.com/@channelname"         // optional
 *   }
 * }
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "socialScore": 0.6425,
 *     "sessionId": "550e8400-e29b-41d4-a716-446655440000",
 *     "platformsAnalyzed": ["linkedin", "youtube"],
 *     "platformStatus": { "linkedin": "SAMPLE_DATA", "youtube": "SAMPLE_DATA" },
 *     "metrics": { ... },
 *     "normalized": { ... },
 *     "timestamp": "2026-02-21T00:00:00.000Z"
 *   }
 * }
 *
 * Error Response (400):
 * {
 *   "success": false,
 *   "message": "No valid profile URLs provided.",
 *   "errors": [ ... ]
 * }
 */
async function handleConnect(req, res) {
    console.log('[SocialController] POST /social/connect BODY:', JSON.stringify(req.body));
    try {
        const { profileUrls } = req.body;

        // Validate presence
        if (!profileUrls || typeof profileUrls !== 'object' || Object.keys(profileUrls).length === 0) {
            console.log('[SocialController] handleConnect REJECT: missing profileUrls');
            return res.status(400).json({
                success: false,
                message: 'Request body must include "profileUrls" with at least one platform URL.',
                example: {
                    profileUrls: {
                        linkedin: 'https://linkedin.com/in/username',
                        twitter: 'https://x.com/username',
                        instagram: 'https://instagram.com/username',
                        youtube: 'https://youtube.com/@channelname',
                    },
                },
            });
        }

        const result = await socialService.connectAndScore(profileUrls);
        console.log('[SocialController] connectAndScore result success:', result.success, 'platformsAnalyzed:', result.data?.platformsAnalyzed);

        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[SocialController] handleConnect error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

/**
 * GET /social/profiles
 * Returns the stored profile data for LinkedIn, X, Instagram (fetched from submitted URLs).
 */
function handleGetProfiles(req, res) {
    console.log('[SocialController] GET /social/profiles called');
    try {
        const profiles = socialService.getStoredProfiles();
        console.log('[SocialController] getStoredProfiles returned keys:', Object.keys(profiles));
        return res.status(200).json({
            success: true,
            data: profiles,
        });
    } catch (err) {
        console.error('[SocialController] handleGetProfiles error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

/**
 * GET /social/oauth/:platform/callback
 *
 * Handles OAuth redirect callbacks from social platforms.
 *
 * Query params: code, state, error, error_description
 */
async function handleOAuthCallback(req, res) {
    try {
        const { platform } = req.params;
        const { code, state, error, error_description } = req.query;

        // Handle OAuth errors
        if (error) {
            console.warn(`[SocialController] OAuth error for ${platform}:`, error, error_description);
            return res.status(400).json({
                success: false,
                message: `OAuth authentication failed for ${platform}.`,
                error: error_description || error,
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code is missing from OAuth callback.',
            });
        }

        // Exchange code for token and fetch metadata
        const codeVerifier = req.query.code_verifier; // For Twitter PKCE
        const metadata = await socialService.handleOAuthCallback(platform, code, codeVerifier);

        return res.status(200).json({
            success: true,
            message: `Successfully authenticated with ${platform}.`,
            platform,
            state,
            metadata,
        });
    } catch (err) {
        console.error(`[SocialController] OAuth callback error:`, err);
        return res.status(500).json({
            success: false,
            message: 'Failed to complete OAuth flow.',
            error: err.message,
        });
    }
}

module.exports = {
    handleConnect,
    handleGetProfiles,
    handleOAuthCallback,
};
