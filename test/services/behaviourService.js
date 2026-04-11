/**
 * Behavioural Quiz Service
 *
 * Business logic for quiz sessions: question selection,
 * response scoring, and anonymized result storage.
 */
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const config = require('../config');
const { selectQuestions, validateResponses, calculateScore } = require('../utils/quizEngine');

// ─── PostgreSQL Pool ────────────────────────────────────────────────

let pool = null;
let useDb = false;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS behaviour_results (
    id            SERIAL PRIMARY KEY,
    session_id    UUID NOT NULL UNIQUE,
    normalized_score NUMERIC(6,4) NOT NULL,
    total_score   INTEGER NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );
`;

const INSERT_SQL = `
  INSERT INTO behaviour_results (session_id, normalized_score, total_score)
  VALUES ($1, $2, $3)
  RETURNING session_id, normalized_score, total_score, created_at;
`;

// In-memory fallback
const memoryStore = new Map();

/**
 * Initializes the database connection (or falls back to memory).
 */
async function init() {
    try {
        pool = new Pool({
            host: config.postgres.host,
            port: config.postgres.port,
            database: config.postgres.database,
            user: config.postgres.user,
            password: config.postgres.password,
            ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
            max: 5,
            idleTimeoutMillis: 30000,
        });

        await pool.query(CREATE_TABLE_SQL);
        useDb = true;
        console.log('[BehaviourService] PostgreSQL table ready.');
    } catch (err) {
        console.warn(`[BehaviourService] DB unavailable, using in-memory store: ${err.message}`);
        useDb = false;
    }
}

// ─── Get Quiz Questions ────────────────────────────────────────────

/**
 * Generates a new quiz session with 5 random questions.
 *
 * @returns {Object}
 */
function getQuizQuestions() {
    const { sessionQuestions, questionIds } = selectQuestions(5);

    return {
        success: true,
        message: '5 random behavioural risk questions selected.',
        data: {
            questions: sessionQuestions,
            _questionIds: questionIds, // for internal tracking
        },
    };
}

// ─── Submit Quiz ───────────────────────────────────────────────────

/**
 * Validates responses, calculates score, and stores anonymized result.
 *
 * @param {Object[]} responses - [{ questionId, answer }]
 * @returns {Promise<Object>}
 */
async function submitQuiz(responses) {
    // 1. Validate
    const validation = validateResponses(responses);
    if (!validation.valid) {
        return { success: false, message: 'Validation failed.', errors: validation.errors };
    }

    // 2. Calculate score
    const { totalScore, behaviourScore, normalizedScore } = calculateScore(responses);

    // 3. Store anonymized result
    const sessionId = uuidv4();
    const timestamp = new Date().toISOString();

    if (useDb) {
        try {
            await pool.query(INSERT_SQL, [sessionId, normalizedScore, totalScore]);
            console.log(`[BehaviourService] Result stored in DB: ${sessionId}`);
        } catch (err) {
            console.warn(`[BehaviourService] DB insert failed, using memory: ${err.message}`);
            memoryStore.set(sessionId, { normalizedScore, totalScore, createdAt: timestamp });
        }
    } else {
        memoryStore.set(sessionId, { normalizedScore, totalScore, createdAt: timestamp });
    }

    // 4. Return scores (Enriched for UI)
    const riskScore = Math.round(normalizedScore * 100);
    const healthStatus = riskScore > 70 ? 'High Integrity' : (riskScore > 40 ? 'Moderate' : 'Risk Flag');
    const analysis = `The applicant demonstrates a ${healthStatus.toLowerCase()} profile with a risk tolerance score of ${riskScore}%. ` +
        (riskScore > 70 ? 'Strong financial discipline and risk preparedness detected.' : 'Additional collateral or verification may be required.');

    return {
        success: true,
        message: 'Behavioural risk assessment completed.',
        data: {
            sessionId,
            riskScore,
            healthStatus,
            analysis,
            behaviourScore,
            normalizedScore,
            totalScore,
            maxScore: 25,
            timestamp,
        },
    };
}

module.exports = {
    init,
    getQuizQuestions,
    submitQuiz,
};
