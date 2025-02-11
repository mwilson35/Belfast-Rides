const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db'); // adjust if needed
const { authenticateToken } = require('./middleware');

// Configure storage: Files will be stored in the "uploads" folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists in your project root.
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/uploadDocument', authenticateToken, upload.single('document'), (req, res) => {
  const driverId = req.user.id; // From your auth middleware.
  const documentType = req.body.documentType || req.query.documentType;
  if (!documentType) {
    return res.status(400).json({ message: "documentType is required" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const filePath = req.file.path;

  db.query(
    "INSERT INTO driver_documents (driver_id, document_type, file_path, status) VALUES (?, ?, ?, ?)",
    [driverId, documentType, filePath, 'pending'],
    (err, result) => {
      if (err) {
        console.error("Error saving document metadata:", err);
        return res.status(500).json({ message: "Error saving document metadata" });
      }
      res.status(201).json({
        message: "Document uploaded and metadata stored successfully",
        documentId: result.insertId,
        file: req.file,
        documentType: documentType
      });
    }
  );
});

module.exports = router;
