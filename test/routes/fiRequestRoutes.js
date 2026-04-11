/**
 * FI Routes
 *
 * Defines Express route mappings for Account Aggregator FI data
 * requests (initiate) and fetch (decrypt + parse).
 */
const { Router } = require('express');
const {
    handleFiRequest,
    handleGetSession,
    handleListSessions,
    handleFetchData,
} = require('../controllers/fiRequestController');
const { handleFiFetch } = require('../controllers/fiFetchController');

const router = Router();

/**
 * POST /fi/request
 * Initiates an FI data request to the Account Aggregator.
 */
router.post('/fi/request', handleFiRequest);

/**
 * POST /fi/fetch
 * Fetches encrypted FI data, decrypts, and returns parsed transactions.
 * Body: { "sessionId": "..." }
 */
router.post('/fi/fetch', handleFiFetch);

/**
 * GET /fi/sessions
 * Lists all FI request sessions.
 */
router.get('/fi/sessions', handleListSessions);

/**
 * GET /fi/session/:txnid
 * Retrieves a specific FI session by transaction ID.
 */
router.get('/fi/session/:txnid', handleGetSession);

/**
 * GET /fi/fetch/:sessionId
 * Quick fetch using GET (legacy/convenience).
 */
router.get('/fi/fetch/:sessionId', handleFetchData);

module.exports = router;

