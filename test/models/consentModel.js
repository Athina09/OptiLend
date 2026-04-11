/**
 * Consent Model Schema & PostgreSQL Queries
 *
 * Defines the consent_log table structure and query functions
 * for RBI Account Aggregator (AA) consent artefacts per ReBIT AA API v2.0.
 */
const { Pool } = require('pg');
const config = require('../config');

// ─── PostgreSQL Connection Pool ────────────────────────────────────
let pool = null;

function getPool() {
    if (!pool) {
        pool = new Pool({
            host: config.postgres.host,
            port: config.postgres.port,
            database: config.postgres.database,
            user: config.postgres.user,
            password: config.postgres.password,
            ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
            console.error('[ConsentModel] PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

// ─── Table Creation ────────────────────────────────────────────────

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS consent_log (
  id                SERIAL PRIMARY KEY,
  consent_id        UUID NOT NULL UNIQUE,
  user_reference_id VARCHAR(255) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  fi_types          JSONB NOT NULL,
  data_range        JSONB NOT NULL,
  data_life         JSONB NOT NULL,
  purpose           JSONB NOT NULL DEFAULT '{"code": "101", "text": "Wealth management service"}',
  consent_artefact  JSONB NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'REVOKED', 'PAUSED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_consent_user_ref ON consent_log(user_reference_id);
CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_log(status);
CREATE INDEX IF NOT EXISTS idx_consent_created ON consent_log(created_at);
`;

/**
 * Creates the consent_log table if it doesn't exist.
 */
async function initTable() {
    try {
        const db = getPool();
        await db.query(CREATE_TABLE_SQL);
        console.log('[ConsentModel] consent_log table ready.');
        return true;
    } catch (err) {
        console.warn('[ConsentModel] Could not init table (DB may be offline):', err.message);
        return false;
    }
}

// ─── INSERT ────────────────────────────────────────────────────────

const INSERT_SQL = `
INSERT INTO consent_log (
  consent_id, user_reference_id, status,
  fi_types, data_range, data_life, purpose, consent_artefact,
  created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
RETURNING *;
`;

/**
 * Inserts a new consent artefact into consent_log.
 *
 * @param {Object} consent - The consent object to insert.
 * @returns {Promise<Object>} The inserted row.
 */
async function insertConsent(consent) {
    const db = getPool();
    const values = [
        consent.consentId,
        consent.userReferenceId,
        consent.status || 'ACTIVE',
        JSON.stringify(consent.fiTypes),
        JSON.stringify(consent.dataRange),
        JSON.stringify(consent.dataLife),
        JSON.stringify(consent.purpose),
        JSON.stringify(consent.consentArtefact),
        consent.createdAt || new Date().toISOString(),
    ];

    const result = await db.query(INSERT_SQL, values);
    return result.rows[0];
}

// ─── SELECT ────────────────────────────────────────────────────────

/**
 * Retrieves a consent artefact by consentId.
 */
async function getConsentById(consentId) {
    const db = getPool();
    const result = await db.query(
        'SELECT * FROM consent_log WHERE consent_id = $1',
        [consentId],
    );
    return result.rows[0] || null;
}

/**
 * Retrieves all consent artefacts for a user.
 */
async function getConsentsByUser(userReferenceId) {
    const db = getPool();
    const result = await db.query(
        'SELECT * FROM consent_log WHERE user_reference_id = $1 ORDER BY created_at DESC',
        [userReferenceId],
    );
    return result.rows;
}

// ─── REVOKE ────────────────────────────────────────────────────────

/**
 * Revokes a consent artefact by setting status to REVOKED.
 */
async function revokeConsent(consentId) {
    const db = getPool();
    const result = await db.query(
        `UPDATE consent_log
     SET status = 'REVOKED', revoked_at = NOW(), updated_at = NOW()
     WHERE consent_id = $1 AND status = 'ACTIVE'
     RETURNING *`,
        [consentId],
    );
    return result.rows[0] || null;
}

// ─── CLOSE POOL ────────────────────────────────────────────────────

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

module.exports = {
    initTable,
    insertConsent,
    getConsentById,
    getConsentsByUser,
    revokeConsent,
    closePool,
};
