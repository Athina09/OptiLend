const express = require('express');
const { postScore } = require('../controllers/scoreController');

const router = express.Router();

router.post('/', postScore);

module.exports = router;
