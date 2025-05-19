const express = require('express');
const router = express.Router();
const db = require('../db'); 

// Get all user documents with user info
router.get('/admin/user-documents', (req, res) => {
    db.query(`
        SELECT ud.id, ud.user_id, ud.document_type, ud.file_path, ud.status, ud.uploaded_at,
               u.username, u.email
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
