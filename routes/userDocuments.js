const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db'); 
const { authenticateToken } = require('./middleware'); 

// Configure storage: Files will be stored in the "uploads" folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/uploadDocument', authenticateToken, upload.single('document'), (req, res) => {
  const userId = req.user.id; // Works for both riders and drivers.
  const documentType = req.body.documentType || req.query.documentType;
  
  // Ensure documentType is provided.
  if (!documentType) {
    return res.status(400).json({ message: "documentType is required" });
  }
  
  // Ensure a file is uploaded.
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  // Allowed front-end types.
  const allowedTypes = ['driversLicense', 'insuranceDocument', 'taxiDocument', 'profilePhoto'];
  if (!allowedTypes.includes(documentType)) {
    return res.status(400).json({ message: "Invalid documentType provided" });
  }
  
  // Normalize the file path.
  const filePath = req.file.path.replace(/\\/g, '/');
  
  
  // Map incoming documentType to database values.
  let dbDocumentType;
  switch (documentType) {
    case 'driversLicense':
      dbDocumentType = 'license';
      break;
    case 'insuranceDocument':
      dbDocumentType = 'insurance';
      break;
    case 'taxiDocument':
      dbDocumentType = 'taxiDocument';
      break;
    case 'profilePhoto':
      dbDocumentType = 'profilePhoto';
      break;
    default:
      dbDocumentType = '';
  }
 
  if (documentType === 'profilePhoto') {
   
    db.query(
      "UPDATE users SET profilePicUrl = ? WHERE id = ?",
      [filePath, userId],
      (updateErr, updateResult) => {
        if (updateErr) {
          console.error("Error updating user profile:", updateErr);
          return res.status(500).json({ message: "Error updating user profile" });
        }
       
        // Insert the document metadata.
        db.query(
          "INSERT INTO user_documents (user_id, document_type, file_path, status) VALUES (?, ?, ?, ?)",
          [userId, dbDocumentType, filePath, 'pending'],
          (err, result) => {
            if (err) {
              console.error("Error saving document metadata:", err);
              return res.status(500).json({ message: "Error saving document metadata" });
            }
            res.status(201).json({
              message: "Profile photo uploaded and profile updated successfully",
              documentId: result.insertId,
              file: req.file,
              documentType: dbDocumentType,
              profilePicUrl: filePath,
            });
          }
        );
      }
    );
  } else {
    // For other document types, insert the document metadata.
    db.query(
      "INSERT INTO user_documents (user_id, document_type, file_path, status) VALUES (?, ?, ?, ?)",
      [userId, dbDocumentType, filePath, 'pending'],
      (err, result) => {
        if (err) {
          console.error("Error saving document metadata:", err);
          return res.status(500).json({ message: "Error saving document metadata" });
        }
        res.status(201).json({
          message: "Document uploaded and metadata stored successfully",
          documentId: result.insertId,
          file: req.file,
          documentType: dbDocumentType,
        });
      }
    );
  }
});

module.exports = router;
