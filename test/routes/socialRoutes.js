/**
 * Social Trust Score Routes
 *
 * POST /social/connect                     — Submit profile URLs + compute social score
 * GET  /social/oauth/:platform/callback    — OAuth callback handler for each platform
 */
const { Router } = require('express');
const { handleConnect, handleGetProfiles, handleOAuthCallback } = require('../controllers/socialController');

const router = Router();

/**
 * POST /social/connect
 * Submit profile URLs for LinkedIn, X, Instagram, YouTube.
 * Backend fetches each URL, extracts meta/data, stores it, and returns score + data.
 */
router.post('/social/connect', handleConnect);

/**
 * GET /social/profiles
 * Returns stored profile data for all 3 platforms (linkedin, twitter, instagram).
 * Data is from the last POST /social/connect submissions.
 */
router.get('/social/profiles', handleGetProfiles);

/**
 * GET /social/oauth/:platform/callback
 * OAuth redirect callback handler for each social platform.
 * Platform: linkedin | twitter | instagram | youtube
 */
router.get('/social/oauth/:platform/callback', handleOAuthCallback);

module.exports = router;
