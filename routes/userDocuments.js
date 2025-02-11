// routes/userDocuments.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db'); // Adjust the path to your database module
const { authenticateToken } = require('./middleware'); // Adjust if needed

// Configure storage: Files will be stored in the "uploads" folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure the uploads folder exists in your project root.
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/**
 * Endpoint: POST /documents/uploadDocument
 *
 * Expects:
 * - A file uploaded with the field name "document"
 * - A form parameter "documentType" (in req.body or as a query parameter) indicating the type of document
 *
 * What it does:
 * 1. Saves the uploaded file to the "uploads" folder.
 * 2. Inserts a record into the `user_documents` table with the user ID, document type, file path, and status.
 */
router.post('/uploadDocument', authenticateToken, upload.single('document'), (req, res) => {
  const userId = req.user.id; // This works for both riders and drivers.
  const documentType = req.body.documentType || req.query.documentType;
  
  if (!documentType) {
    return res.status(400).json({ message: "documentType is required" });
  }
  
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const filePath = req.file.path; // e.g., "uploads/document-163234234234-123456789.jpg"
  
  // Insert metadata into the user_documents table.
  db.query(
    "INSERT INTO user_documents (user_id, document_type, file_path, status) VALUES (?, ?, ?, ?)",
    [userId, documentType, filePath, 'pending'],
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
