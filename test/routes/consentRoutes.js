/**
 * Consent Routes
 *
 * Defines Express route mappings for Account Aggregator consent management.
 */
const { Router } = require('express');
const {
    handleCreate,
    handleGet,
    handleGetByUser,
    handleRevoke,
} = require('../controllers/consentController');

const router = Router();

/**
 * POST /consent/create
 * Creates a new consent artefact.
 */
router.post('/consent/create', handleCreate);

/**
 * GET /consent/user/:userReferenceId
 * Retrieves all consents for a user.
 * NOTE: This route must be defined BEFORE /consent/:consentId to avoid conflicts.
 */
router.get('/consent/user/:userReferenceId', handleGetByUser);

/**
 * GET /consent/:consentId
 * Retrieves a single consent artefact by ID.
 */
router.get('/consent/:consentId', handleGet);

/**
 * POST /consent/:consentId/revoke
 * Revokes an active consent artefact.
 */
router.post('/consent/:consentId/revoke', handleRevoke);

module.exports = router;
