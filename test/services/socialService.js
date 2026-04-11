/**
 * Social Service — Orchestrator
 *
 * Coordinates OAuth flows, metadata fetching, and score computation
 * across LinkedIn, X (Twitter), Instagram, and YouTube.
 *
 * Privacy-first: No personal content, captions, comments, messages,
 * or raw usernames/handles are stored. Only anonymized sessionId,
 * calculated socialScore, and timestamp are persisted.
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const socialScoreModel = require('../models/socialScoreModel');
const { validateAllUrls } = require('../utils/urlValidator');
const { calculateSocialScore } = require('../utils/socialScoreCalculator');
const { fetchProfileMeta } = require('../utils/fetchProfileMeta');
const linkedinService = require('./linkedinService');
const twitterService = require('./twitterService');
const instagramService = require('./instagramService');
const youtubeService = require('./youtubeService');

// Map platform names to their service modules
const PLATFORM_SERVICES = {
    linkedin: linkedinService,
    twitter: twitterService,
    instagram: instagramService,
    youtube: youtubeService,
};

// In-memory store for fetched profile data (per platform). Dashboard reads from here.
const storedProfiles = {
    linkedin: null,
    twitter: null,
    instagram: null,
};

/** Path for debug file: test/data/fetched-profiles.json */
const FETCHED_PROFILES_FILE = path.join(__dirname, '..', 'data', 'fetched-profiles.json');

function writeStoredProfilesToFile() {
    try {
        const dir = path.dirname(FETCHED_PROFILES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const snapshot = {
            writtenAt: new Date().toISOString(),
            storedProfiles: { ...storedProfiles },
        };
        fs.writeFileSync(FETCHED_PROFILES_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
        console.log('[SocialService] Wrote fetched data to', FETCHED_PROFILES_FILE);
    } catch (err) {
        console.warn('[SocialService] Failed to write fetched-profiles file:', err.message);
    }
}

// ─── Initialization ────────────────────────────────────────────────

let initialized = false;

/**
 * Initializes the social score database table.
 */
async function init() {
    try {
        await socialScoreModel.initTable();
        initialized = true;
        console.log('[SocialService] Initialized successfully.');
    } catch (err) {
        console.warn('[SocialService] Init warning (DB may be offline):', err.message);
        initialized = false;
    }
}

// ─── OAuth URL Generation ──────────────────────────────────────────

/**
 * Generates OAuth authorization URLs for requested platforms.
 *
 * @param {string[]} platforms - Platforms to generate URLs for.
 * @param {string} sessionId  - Session identifier for state tracking.
 * @returns {Object} Map of platform → authUrl.
 */
function getOAuthUrls(platforms, sessionId) {
    const urls = {};
    for (const platform of platforms) {
        const service = PLATFORM_SERVICES[platform];
        if (!service) continue;

        if (platform === 'twitter') {
            const pkce = twitterService.generatePKCE();
            urls[platform] = {
                authUrl: service.getAuthUrl(sessionId, pkce.codeChallenge),
                codeVerifier: pkce.codeVerifier,
            };
        } else {
            urls[platform] = {
                authUrl: service.getAuthUrl(sessionId),
            };
        }
    }
    return urls;
}

// ─── Core: Connect + Score ─────────────────────────────────────────

/**
 * Main orchestration function.
 * Validates URLs, fetches metadata from each platform (dev mode if no real OAuth),
 * computes social score, and persists anonymized result.
 *
 * @param {Object} profileUrls - Map of platform → profile URL.
 * @returns {Promise<Object>} Result with socialScore.
 */
async function connectAndScore(profileUrls) {
    console.log('[SocialService] connectAndScore INPUT profileUrls:', JSON.stringify(profileUrls));

    // 1. Validate all URLs
    const validation = validateAllUrls(profileUrls);
    console.log('[SocialService] VALIDATION result - validPlatforms:', Object.keys(validation.validated), 'errors:', validation.errors);

    // Allow partial — proceed with whatever validated successfully
    const validPlatforms = Object.keys(validation.validated);

    if (validPlatforms.length === 0) {
        console.log('[SocialService] EXIT: No valid platforms');
        return {
            success: false,
            message: 'No valid profile URLs provided.',
            errors: validation.errors,
        };
    }

    // 2. Generate anonymized session ID (UUID v4)
    const sessionId = uuidv4();

    // 3. Fetch metadata from each valid platform
    const platformData = {};
    const platformStatus = {};
    const warnings = [];

    const fetchPromises = validPlatforms.map(async (platform) => {
        try {
            const service = PLATFORM_SERVICES[platform];
            const profileUrl = validation.validated[platform].url;

            // 1. Fetch real data from the profile URL (meta tags, og:title, etc.)
            let fetchedMeta = {};
            try {
                console.log('[SocialService] FETCHING platform:', platform, 'url:', profileUrl);
                const metaResult = await fetchProfileMeta(profileUrl, { platform });
                console.log('[SocialService] FETCH result for', platform, 'fetched:', metaResult.fetched, 'error:', metaResult.error);
                if (metaResult.fetched) {
                    fetchedMeta = {
                        ogTitle: metaResult.ogTitle,
                        ogDescription: metaResult.ogDescription,
                        ogImage: metaResult.ogImage,
                        title: metaResult.title,
                        profileUrl: metaResult.profileUrl,
                    };
                    platformStatus[platform] = 'FETCHED';
                    console.log('[SocialService] fetchedMeta for', platform, ':', JSON.stringify(fetchedMeta));
                } else {
                    platformStatus[platform] = metaResult.error ? 'FETCH_FAILED' : 'SAMPLE_DATA';
                }
            } catch (fetchErr) {
                console.warn(`[SocialService] ${platform} URL fetch:`, fetchErr.message);
                platformStatus[platform] = 'FETCH_FAILED';
            }

            // 2. Get numeric metrics for scoring (from service sample when OAuth not configured)
            let metrics = {};
            if (service) {
                metrics = service.generateSampleData();
                if (!platformStatus[platform]) platformStatus[platform] = 'SAMPLE_DATA';
            } else {
                platformStatus[platform] = platformStatus[platform] || 'UNSUPPORTED';
            }

            // Keep merged data for score calculation only; we store only fetchedMeta for display
            platformData[platform] = { ...metrics, ...fetchedMeta };
            platformData[platform]._fetchedOnly = { ...fetchedMeta };
        } catch (err) {
            console.error(`[SocialService] ${platform} fetch failed:`, err.message);
            platformStatus[platform] = 'FAILED';
            warnings.push(`${platform}: ${err.message}`);
        }
    });

    await Promise.all(fetchPromises);

    // 4. Check if we got any data
    const platformsWithData = Object.keys(platformData);
    if (platformsWithData.length === 0) {
        return {
            success: false,
            message: 'Failed to fetch metadata from any platform.',
            platformStatus,
            errors: warnings,
        };
    }

    // 5. Compute social score
    const scoreResult = calculateSocialScore(platformData);

    // 6. Persist anonymized score (no PII)
    let dbRecord = null;
    try {
        dbRecord = await socialScoreModel.insertScore(
            sessionId,
            scoreResult.socialScore,
            platformsWithData,
        );
    } catch (err) {
        console.warn('[SocialService] DB insert failed (continuing without persistence):', err.message);
    }

    // 7. Build response (include platformData for frontend to store and display)
    const response = {
        success: true,
        data: {
            socialScore: scoreResult.socialScore,
            sessionId,
            platformsAnalyzed: platformsWithData,
            platformStatus,
            platformData,
            metrics: {
                networkSize: scoreResult.metrics.networkSize,
                postFrequency: scoreResult.metrics.postFrequency,
                accountAgeDays: scoreResult.metrics.accountAgeDays,
                interactionRate: scoreResult.metrics.interactionRate,
            },
            normalized: scoreResult.normalized,
            timestamp: dbRecord?.created_at || new Date().toISOString(),
        },
    };

    // Include non-critical warnings
    if (warnings.length > 0) {
        response.data.warnings = warnings;
    }
    if (validation.errors.length > 0) {
        response.data.validationWarnings = validation.errors;
    }

    // 8. Store ONLY original fetched data (no sample metrics) for dashboard display
    const storeKeys = ['linkedin', 'twitter', 'instagram'];
    console.log('[SocialService] STORING to storedProfiles, platformsWithData:', platformsWithData);
    for (const platform of platformsWithData) {
        if (!storeKeys.includes(platform)) continue;
        const url = validation.validated[platform].url;
        const fetchedOnly = platformData[platform]._fetchedOnly || {};
        storedProfiles[platform] = {
            url,
            status: platformStatus[platform],
            platformData: { ...fetchedOnly },
            socialScore: scoreResult.socialScore,
            timestamp: response.data.timestamp,
        };
        console.log('[SocialService] STORED', platform, ':', JSON.stringify(storedProfiles[platform]));
    }
    console.log('[SocialService] connectAndScore DONE, storedProfiles keys:', Object.keys(storedProfiles).filter(k => storedProfiles[k]));
    writeStoredProfilesToFile();

    return response;
}

/**
 * Returns the stored profile data for all platforms (for GET /social/profiles).
 * @returns {{ linkedin?: Object, twitter?: Object, instagram?: Object }}
 */
function getStoredProfiles() {
    const out = {};
    if (storedProfiles.linkedin) out.linkedin = storedProfiles.linkedin;
    if (storedProfiles.twitter) out.twitter = storedProfiles.twitter;
    if (storedProfiles.instagram) out.instagram = storedProfiles.instagram;
    console.log('[SocialService] getStoredProfiles RETURN keys:', Object.keys(out), 'sample:', Object.keys(out).length ? JSON.stringify(out[Object.keys(out)[0]], null, 0).slice(0, 200) : 'none');
    return out;
}

// ─── OAuth Callback Handler ────────────────────────────────────────

/**
 * Handles OAuth callback for a specific platform.
 * Exchanges code for token and fetches metadata.
 *
 * @param {string} platform     - Platform name.
 * @param {string} code         - Authorization code.
 * @param {string} [codeVerifier] - PKCE verifier (Twitter only).
 * @returns {Promise<Object>} Platform metadata.
 */
async function handleOAuthCallback(platform, code, codeVerifier) {
    const service = PLATFORM_SERVICES[platform?.toLowerCase()];
    if (!service) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    let accessToken;
    if (platform === 'twitter') {
        accessToken = await service.exchangeCode(code, codeVerifier);
    } else {
        accessToken = await service.exchangeCode(code);
    }

    const metadata = await service.fetchMetadata(accessToken);
    return metadata;
}

module.exports = {
    init,
    connectAndScore,
    getOAuthUrls,
    handleOAuthCallback,
    getStoredProfiles,
};
