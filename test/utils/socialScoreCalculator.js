/**
 * Social Score Calculator Utility
 *
 * Computes a normalized social trust score from public activity metadata
 * across LinkedIn, X (Twitter), Instagram, and YouTube.
 *
 * Formula:
 *   socialScore = 0.25 * normalizedNetworkSize
 *               + 0.25 * normalizedPostFrequency
 *               + 0.25 * normalizedAccountAge
 *               + 0.25 * normalizedInteractionRate
 *
 * All metrics are normalized to range 0–1.
 */

// ─── Normalization Boundaries ──────────────────────────────────────
// These represent reasonable upper bounds for MSME social profiles.
// Values above max are clamped to 1.0; below min to 0.0.

const NORMALIZATION_BOUNDS = {
    networkSize: { min: 0, max: 50000 },       // connections + followers + subscribers
    postFrequency: { min: 0, max: 30 },         // posts per month
    accountAgeDays: { min: 0, max: 3650 },      // ~10 years in days
    interactionRate: { min: 0, max: 1000 },     // avg likes + replies + views aggregate
};

const SCORE_WEIGHTS = {
    networkSize: 0.25,
    postFrequency: 0.25,
    accountAge: 0.25,
    interactionRate: 0.25,
};

/**
 * Normalizes a value to the range [0, 1] given min/max bounds.
 *
 * @param {number} value - The raw value to normalize.
 * @param {number} min   - Minimum boundary.
 * @param {number} max   - Maximum boundary.
 * @returns {number} Normalized value clamped to [0, 1].
 */
function normalize(value, min, max) {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    if (max <= min) return 0;
    const clamped = Math.min(Math.max(value, min), max);
    return (clamped - min) / (max - min);
}

/**
 * Computes raw aggregate metrics from platform metadata.
 *
 * @param {Object} platformData - Metadata from each platform.
 * @param {Object} [platformData.linkedin]  - LinkedIn metadata.
 * @param {Object} [platformData.twitter]   - Twitter/X metadata.
 * @param {Object} [platformData.instagram] - Instagram metadata.
 * @param {Object} [platformData.youtube]   - YouTube metadata.
 * @returns {Object} Computed metrics: { accountAge, postFrequency, interactionRate, networkSize }
 */
function computeMetrics(platformData) {
    const now = new Date();
    let totalNetwork = 0;
    let totalPostsLast6Months = 0;
    let totalLikes = 0;
    let totalReplies = 0;
    let totalViews = 0;
    let interactionSources = 0;
    let oldestAccountDate = now;
    let platformCount = 0;

    // ── LinkedIn ───────────────────────────────────────────
    if (platformData.linkedin) {
        const li = platformData.linkedin;
        totalNetwork += li.connectionCount || 0;
        totalPostsLast6Months += li.postsLast6Months || 0;
        if (li.accountCreatedAt) {
            const created = new Date(li.accountCreatedAt);
            if (created < oldestAccountDate) oldestAccountDate = created;
        }
        platformCount++;
    }

    // ── Twitter / X ────────────────────────────────────────
    if (platformData.twitter) {
        const tw = platformData.twitter;
        totalNetwork += tw.followerCount || 0;
        totalPostsLast6Months += tw.tweetsLast6Months || 0;
        if (tw.avgLikes) { totalLikes += tw.avgLikes; interactionSources++; }
        if (tw.avgReplies) { totalReplies += tw.avgReplies; interactionSources++; }
        if (tw.accountCreatedAt) {
            const created = new Date(tw.accountCreatedAt);
            if (created < oldestAccountDate) oldestAccountDate = created;
        }
        platformCount++;
    }

    // ── Instagram ──────────────────────────────────────────
    if (platformData.instagram) {
        const ig = platformData.instagram;
        totalNetwork += ig.followerCount || 0;
        totalPostsLast6Months += ig.postsLast6Months || 0;
        if (ig.avgLikes) { totalLikes += ig.avgLikes; interactionSources++; }
        if (ig.accountCreatedAt) {
            const created = new Date(ig.accountCreatedAt);
            if (created < oldestAccountDate) oldestAccountDate = created;
        }
        platformCount++;
    }

    // ── YouTube ────────────────────────────────────────────
    if (platformData.youtube) {
        const yt = platformData.youtube;
        totalNetwork += yt.subscriberCount || 0;
        totalPostsLast6Months += yt.videosLast6Months || 0;
        if (yt.avgViews) { totalViews += yt.avgViews; interactionSources++; }
        if (yt.channelCreatedAt) {
            const created = new Date(yt.channelCreatedAt);
            if (created < oldestAccountDate) oldestAccountDate = created;
        }
        platformCount++;
    }

    // ── Compute Derived Metrics ────────────────────────────
    const accountAgeDays = Math.max(0, Math.floor((now - oldestAccountDate) / (1000 * 60 * 60 * 24)));
    const postFrequency = totalPostsLast6Months / 6; // posts per month
    const interactionRate = totalLikes + totalReplies + totalViews;

    return {
        networkSize: totalNetwork,
        postFrequency,
        accountAgeDays,
        interactionRate,
        platformCount,
        raw: {
            totalNetwork,
            totalPostsLast6Months,
            totalLikes,
            totalReplies,
            totalViews,
            oldestAccountDate: oldestAccountDate.toISOString(),
        },
    };
}

/**
 * Calculates the final social trust score from platform metadata.
 *
 * @param {Object} platformData - Metadata keyed by platform name.
 * @returns {{ socialScore: number, metrics: Object, normalized: Object }}
 */
function calculateSocialScore(platformData) {
    const metrics = computeMetrics(platformData);

    // Normalize each metric to 0–1
    const normalized = {
        networkSize: normalize(metrics.networkSize, NORMALIZATION_BOUNDS.networkSize.min, NORMALIZATION_BOUNDS.networkSize.max),
        postFrequency: normalize(metrics.postFrequency, NORMALIZATION_BOUNDS.postFrequency.min, NORMALIZATION_BOUNDS.postFrequency.max),
        accountAge: normalize(metrics.accountAgeDays, NORMALIZATION_BOUNDS.accountAgeDays.min, NORMALIZATION_BOUNDS.accountAgeDays.max),
        interactionRate: normalize(metrics.interactionRate, NORMALIZATION_BOUNDS.interactionRate.min, NORMALIZATION_BOUNDS.interactionRate.max),
    };

    // Weighted sum
    const socialScore =
        (SCORE_WEIGHTS.networkSize * normalized.networkSize) +
        (SCORE_WEIGHTS.postFrequency * normalized.postFrequency) +
        (SCORE_WEIGHTS.accountAge * normalized.accountAge) +
        (SCORE_WEIGHTS.interactionRate * normalized.interactionRate);

    // Round to 4 decimal places
    const roundedScore = Math.round(socialScore * 10000) / 10000;

    return {
        socialScore: roundedScore,
        metrics,
        normalized,
    };
}

module.exports = {
    normalize,
    computeMetrics,
    calculateSocialScore,
    NORMALIZATION_BOUNDS,
    SCORE_WEIGHTS,
};
