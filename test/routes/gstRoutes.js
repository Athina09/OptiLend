/**
 * GST Filing Routes
 */
const { Router } = require('express');
const { handleFetchGst } = require('../controllers/gstController');

const router = Router();

/**
 * POST /gst/fetch
 * Fetch GST filing history and compute compliance score.
 */
router.post('/gst/fetch', handleFetchGst);

module.exports = router;
