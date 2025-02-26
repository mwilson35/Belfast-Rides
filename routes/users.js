const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./middleware');

// GET profile endpoint: returns username and email for the logged-in user
router.get('/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT id, username, email FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ message: 'Failed to retrieve profile.' });
    }
    res.json(results[0]);
  });
});



module.exports = router;
