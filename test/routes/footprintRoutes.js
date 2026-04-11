const express = require('express');
const footprintingService = require('../services/footprintingService');
const { calculateSocialScore } = require('../utils/socialScoreCalculator');
const router = express.Router();

/**
 * POST /social/footprint
 * 
 * Performs a recursive public scan of a social media profile
 * to extract trust metadata.
 */
router.post('/social/footprint', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'Profile URL is required.' });
        }

        const footprint = await footprintingService.scanProfile(url);

        // Use the footprint to generate a trust score segment
        const platformData = {};
        platformData[footprint.platform] = footprint;

        const scoreResult = calculateSocialScore(platformData);

        res.status(200).json({
            success: true,
            data: footprint,
            trustScore: scoreResult.socialScore,
            analysis: `Extracted ${footprint.platform} metadata for account ${footprint.handle}. Activity level detected as ${footprint.activityLevel}.`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
