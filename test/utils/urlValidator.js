/**
 * URL Validator Utility
 *
 * Validates social media profile URLs and extracts identifiers
 * for LinkedIn, X (Twitter), Instagram, and YouTube.
 */

const PLATFORM_PATTERNS = {
    linkedin: {
        // Matches: linkedin.com/in/username or company/name (with optional trailing path/query)
        regex: /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/([a-zA-Z0-9\-_.]+)/i,
        extractIndex: 3,
        label: 'LinkedIn',
        example: 'https://linkedin.com/in/username',
    },
    twitter: {
        // Matches: twitter.com/username or x.com/username
        regex: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/i,
        extractIndex: 3,
        label: 'X (Twitter)',
        example: 'https://x.com/username',
    },
    instagram: {
        // Matches: instagram.com/username (hyphen allowed; optional trailing path/query)
        regex: /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.\-]{1,30})/i,
        extractIndex: 2,
        label: 'Instagram',
        example: 'https://instagram.com/username',
    },
    youtube: {
        // Matches: youtube.com/@handle or channel/ID or c/name
        regex: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/(@[a-zA-Z0-9_\-]+|channel\/[a-zA-Z0-9_\-]+|c\/[a-zA-Z0-9_\-]+|[a-zA-Z0-9_\-]+)/i,
        extractIndex: 2,
        label: 'YouTube',
        example: 'https://youtube.com/@channelname',
    },
};

const VALID_PLATFORMS = Object.keys(PLATFORM_PATTERNS);

/**
 * Normalizes a profile URL for validation (trim, add protocol if missing, strip fragment).
 *
 * @param {string} url - Raw URL string.
 * @returns {string} Normalized URL.
 */
function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let s = url.trim();
    if (!s) return s;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
    try {
        const u = new URL(s);
        u.hash = '';
        return u.toString();
    } catch {
        return s;
    }
}

/**
 * Validates a profile URL for a given platform.
 *
 * @param {string} url      - The profile URL to validate.
 * @param {string} platform - One of: linkedin, twitter, instagram, youtube.
 * @returns {{ valid: boolean, identifier?: string, error?: string }}
 */
function validateProfileUrl(url, platform) {
    const platformKey = platform.toLowerCase();

    if (!PLATFORM_PATTERNS[platformKey]) {
        return {
            valid: false,
            error: `Unknown platform: "${platform}". Valid platforms: ${VALID_PLATFORMS.join(', ')}`,
        };
    }

    if (!url || typeof url !== 'string') {
        return { valid: false, error: `Profile URL is required for ${PLATFORM_PATTERNS[platformKey].label}.` };
    }

    const trimmed = normalizeUrl(url);
    if (!trimmed) {
        return { valid: false, error: `Profile URL is required for ${PLATFORM_PATTERNS[platformKey].label}.` };
    }
    const pattern = PLATFORM_PATTERNS[platformKey];
    const match = trimmed.match(pattern.regex);

    if (!match) {
        return {
            valid: false,
            error: `Invalid ${pattern.label} URL. Expected format: ${pattern.example}`,
        };
    }

    return {
        valid: true,
        identifier: match[pattern.extractIndex],
    };
}

/**
 * Validates all provided profile URLs.
 *
 * @param {Object} profileUrls - Map of platform → URL.
 * @returns {{ valid: boolean, validated: Object, errors: string[] }}
 */
function validateAllUrls(profileUrls) {
    const errors = [];
    const validated = {};

    if (!profileUrls || typeof profileUrls !== 'object' || Object.keys(profileUrls).length === 0) {
        return {
            valid: false,
            validated: {},
            errors: ['At least one profile URL is required. Supported platforms: ' + VALID_PLATFORMS.join(', ')],
        };
    }

    for (const [platform, url] of Object.entries(profileUrls)) {
        const normalizedPlatform = platform.toLowerCase();

        if (!VALID_PLATFORMS.includes(normalizedPlatform)) {
            errors.push(`Unknown platform: "${platform}". Valid platforms: ${VALID_PLATFORMS.join(', ')}`);
            continue;
        }

        const result = validateProfileUrl(url, normalizedPlatform);
        if (!result.valid) {
            errors.push(result.error);
        } else {
            validated[normalizedPlatform] = {
                url: normalizeUrl(url.trim()),
                identifier: result.identifier,
            };
        }
    }

    if (Object.keys(validated).length === 0 && errors.length === 0) {
        errors.push('At least one valid profile URL is required.');
    }

    return {
        valid: errors.length === 0,
        validated,
        errors,
    };
}

module.exports = {
    validateProfileUrl,
    validateAllUrls,
    VALID_PLATFORMS,
    PLATFORM_PATTERNS,
};
