/**
 * Behavioural Quiz Controller
 *
 * Express handlers for the behavioural risk assessment quiz.
 */
const behaviourService = require('../services/behaviourService');

/**
 * GET /behaviour/questions
 *
 * Returns 5 randomly selected, shuffled behavioural questions.
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "questions": [
 *       { "id": "BQ07", "text": "...", "options": ["Never", "..."] },
 *       ...
 *     ]
 *   }
 * }
 */
function handleGetQuestions(req, res) {
    try {
        const result = behaviourService.getQuizQuestions();
        return res.status(200).json({
            success: result.success,
            message: result.message,
            data: result.data,
        });
    } catch (err) {
        console.error('[BehaviourController] handleGetQuestions error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

/**
 * POST /behaviour/quiz
 *
 * Submits quiz responses and returns the behavioural risk score.
 *
 * Body:
 * {
 *   "responses": [
 *     { "id": "BQ07", "choice": "Often" },
 *     { "id": "BQ13", "choice": "Sometimes" },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "behaviourScore": 0.72,
 *     "normalizedScore": 0.72,
 *     "totalScore": 18,
 *     "maxScore": 25
 *   }
 * }
 */
async function handleSubmitQuiz(req, res) {
    try {
        const { responses } = req.body;

        if (!responses) {
            return res.status(400).json({
                success: false,
                message: 'responses array is required in the request body.',
            });
        }

        const result = await behaviourService.submitQuiz(responses);
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);
    } catch (err) {
        console.error('[BehaviourController] handleSubmitQuiz error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

module.exports = {
    handleGetQuestions,
    handleSubmitQuiz,
};
