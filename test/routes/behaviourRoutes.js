/**
 * Behavioural Quiz Routes
 */
const { Router } = require('express');
const { handleGetQuestions, handleSubmitQuiz } = require('../controllers/behaviourController');

const router = Router();

/**
 * GET /behaviour/questions
 * Returns 5 random behavioural risk assessment questions.
 */
router.get('/behaviour/questions', handleGetQuestions);

/**
 * POST /behaviour/quiz
 * Submit quiz responses and get behavioural risk score.
 */
router.post('/behaviour/quiz', handleSubmitQuiz);

module.exports = router;
