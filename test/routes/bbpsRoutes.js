/**
 * BBPS Utility Payment Routes
 */
const { Router } = require('express');
const { handleFetchBills } = require('../controllers/bbpsController');

const router = Router();

/**
 * POST /utility/bbps/fetch
 * Fetch utility bill payment history and compute reliability score.
 */
router.post('/utility/bbps/fetch', handleFetchBills);

module.exports = router;
