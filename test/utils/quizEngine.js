/**
 * Quiz Engine Utilities
 *
 * Fisher-Yates shuffle, random question selector,
 * answer validation, and score calculator.
 */
const QUESTION_POOL = require('../data/questionPool');

const QUIZ_SIZE = 5;
const MIN_ANSWER = 1;
const MAX_ANSWER = 5;
const MAX_TOTAL = QUIZ_SIZE * MAX_ANSWER; // 25

// ─── Shuffle (Fisher-Yates) ────────────────────────────────────────

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm.
 * Returns a new shuffled copy (does not mutate original).
 *
 * @param {any[]} arr
 * @returns {any[]} Shuffled copy.
 */
function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ─── Random Question Selector ──────────────────────────────────────

const STANDARD_OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];

/**
 * Randomly selects `count` unique questions from the pool.
 * Returns only id, text, and options (standard Likert scale).
 *
 * @param {number} [count=5] - Number of questions to select.
 * @returns {{ sessionQuestions: Object[], questionIds: string[] }}
 */
function selectQuestions(count = QUIZ_SIZE) {
    const shuffled = shuffle(QUESTION_POOL);
    const selected = shuffled.slice(0, count);

    const sessionQuestions = selected.map((q) => ({
        id: q.questionId,
        text: q.questionText,
        options: STANDARD_OPTIONS
    }));

    const questionIds = selected.map((q) => q.questionId);

    return { sessionQuestions, questionIds };
}

// ─── Validation ────────────────────────────────────────────────────

/**
 * Validates quiz responses.
 *
 * @param {Object[]} responses - [{ id, choice }] where choice is the option text.
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateResponses(responses) {
    const errors = [];

    if (!Array.isArray(responses)) {
        errors.push('responses must be an array of { id, choice } objects.');
        return { valid: false, errors };
    }

    if (responses.length !== QUIZ_SIZE) {
        errors.push(`Exactly ${QUIZ_SIZE} responses required, received ${responses.length}.`);
    }

    // Check for duplicate ids
    const ids = responses.map((r) => r.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
        errors.push('Duplicate id found in responses.');
    }

    // Validate each response
    for (let i = 0; i < responses.length; i++) {
        const r = responses[i];

        if (!r.id || typeof r.id !== 'string') {
            errors.push(`Response ${i + 1}: id is required and must be a string.`);
        }

        if (!r.choice || !STANDARD_OPTIONS.includes(r.choice)) {
            errors.push(`Response ${i + 1} (${r.id}): choice must be one of [${STANDARD_OPTIONS.join(', ')}].`);
        }

        // Validate id exists in pool
        if (r.id && !QUESTION_POOL.find((q) => q.questionId === r.id)) {
            errors.push(`Response ${i + 1}: unknown id '${r.id}'.`);
        }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// ─── Score Calculator ──────────────────────────────────────────────

/**
 * Calculates the behavioural risk score.
 *
 * totalScore      = sum of all mapped answers (1–5)
 * behaviourScore  = totalScore / 25 (raw ratio)
 * normalizedScore = behaviourScore (0–1 range)
 *
 * @param {Object[]} responses - Validated [{ id, choice }].
 * @returns {{ totalScore: number, behaviourScore: number, normalizedScore: number }}
 */
function calculateScore(responses) {
    const totalScore = responses.reduce((sum, r) => {
        const value = STANDARD_OPTIONS.indexOf(r.choice) + 1;
        return sum + value;
    }, 0);
    const behaviourScore = Math.round((totalScore / MAX_TOTAL) * 10000) / 10000;
    const normalizedScore = behaviourScore; // same range (0–1)

    return {
        totalScore,
        behaviourScore,
        normalizedScore,
    };
}

module.exports = {
    shuffle,
    selectQuestions,
    validateResponses,
    calculateScore,
    QUIZ_SIZE,
    MIN_ANSWER,
    MAX_ANSWER,
};
