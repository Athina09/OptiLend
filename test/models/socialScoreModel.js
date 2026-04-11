/**
 * Social Score Model — PostgreSQL Queries
 *
 * Defines the social_scores table structure and query functions
 * for storing anonymized social trust scores.
 *
 * Privacy: Stores ONLY sessionId (UUID), socialScore, platforms used, and timestamp.
 * No personal content, usernames, handles, or post content is ever persisted.
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
            console.error('[SocialScoreModel] PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

// ─── Table Creation ────────────────────────────────────────────────

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS social_scores (
  id              SERIAL PRIMARY KEY,
  session_id      UUID NOT NULL UNIQUE,
  social_score    DECIMAL(5,4) NOT NULL,
  platforms_used  JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_session ON social_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_social_created ON social_scores(created_at);
`;

/**
 * Creates the social_scores table if it doesn't exist.
 * @returns {Promise<boolean>}
 */
async function initTable() {
    try {
        const db = getPool();
        await db.query(CREATE_TABLE_SQL);
        console.log('[SocialScoreModel] social_scores table ready.');
        return true;
    } catch (err) {
        console.warn('[SocialScoreModel] Could not init table (DB may be offline):', err.message);
        return false;
    }
}

// ─── INSERT ────────────────────────────────────────────────────────

const INSERT_SQL = `
INSERT INTO social_scores (session_id, social_score, platforms_used, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING session_id, social_score, created_at;
`;

/**
 * Inserts an anonymized social score record.
 *
 * @param {string} sessionId  - UUID v4 session identifier.
 * @param {number} score      - Computed social score (0.0000–1.0000).
 * @param {string[]} platforms - List of platform names used (e.g. ['linkedin','youtube']).
 * @returns {Promise<Object>} The inserted row.
 */
async function insertScore(sessionId, score, platforms) {
    const db = getPool();
    const values = [sessionId, score, JSON.stringify(platforms)];
    const result = await db.query(INSERT_SQL, values);
    return result.rows[0];
}

// ─── SELECT ────────────────────────────────────────────────────────

/**
 * Retrieves a social score by session ID.
 *
 * @param {string} sessionId - UUID session identifier.
 * @returns {Promise<Object|null>}
 */
async function getScoreBySession(sessionId) {
    const db = getPool();
    const result = await db.query(
        'SELECT session_id, social_score, platforms_used, created_at FROM social_scores WHERE session_id = $1',
        [sessionId],
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
    insertScore,
    getScoreBySession,
    closePool,
};
