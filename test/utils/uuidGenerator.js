/**
 * UUID Generator Utility
 *
 * Generates RFC 4122 v4 UUIDs for consent artefact identifiers.
 */
const { v4: uuidv4, validate: uuidValidate } = require('uuid');

/**
 * Generates a new UUID v4 consent ID.
 *
 * @returns {string} UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
function generateConsentId() {
    return uuidv4();
}

/**
 * Validates whether a string is a valid UUID.
 *
 * @param {string} id - String to validate.
 * @returns {boolean}
 */
function isValidUuid(id) {
    return typeof id === 'string' && uuidValidate(id);
}

module.exports = {
    generateConsentId,
    isValidUuid,
};
