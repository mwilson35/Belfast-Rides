const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust if you live in import path chaos

// Get all user documents with user info
router.get('/admin/user-documents', (req, res) => {
  db.query(`
    SELECT ud.*, u.username, u.email 
    FROM user_documents ud 
    JOIN users u ON u.id = ud.user_id
    ORDER BY ud.id DESC

  `, (err, results) => {
    if (err) {
      console.error('Error fetching documents:', err);
      return res.status(500).json({ message: 'Error fetching documents' });
    }
    res.json(results);
  });
});

module.exports = router;
