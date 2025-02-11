const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./middleware');

router.get('/documents', authenticateToken, (req, res) => {
  const driverId = req.user.id;
  db.query("SELECT document_type, file_path, status, uploaded_at FROM driver_documents WHERE driver_id = ?", [driverId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json({ documents: results });
  });
});

module.exports = router;
