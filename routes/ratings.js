const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware');
const ratingController = require('../controllers/ratingController');

router.post('/', authenticateToken, ratingController.submitRating);
router.get('/:userId', authenticateToken, ratingController.getRating);

module.exports = router;
