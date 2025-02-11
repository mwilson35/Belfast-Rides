// routes/driverDocuments.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure storage for uploaded files.
// Files will be stored in the "uploads" folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists in your project root.
  },
  filename: (req, file, cb) => {
    // Create a unique filename using the field name, a timestamp, and a random number.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize Multer with the storage configuration.
const upload = multer({ storage: storage });

// ----------------------------------------------
// Single File Upload Example
// This route is for testing a single file upload (e.g., a profile photo).
// The expected field name is "profilePhoto".
// ----------------------------------------------
router.post('/uploadDocument', (req, res) => {
  // Use upload.single() middleware for a single file upload.
  upload.single('profilePhoto')(req, res, (err) => {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(500).json({ message: 'Error uploading file' });
    }
    // If upload is successful, return file information.
    res.json({
      message: 'File uploaded successfully',
      file: req.file
    });
  });
});

// ----------------------------------------------
// Future Expansion: Multiple File Uploads
// When you're ready to handle multiple document types (like DVLA license, bank statement, etc.),
// you can use upload.fields() with an array of field definitions.
// Example:
//
// router.post('/uploadDocuments', (req, res) => {
//   upload.fields([
//     { name: 'dvlaElectronicCheck', maxCount: 1 },
//     { name: 'dvlaPlasticLicense', maxCount: 1 },
//     { name: 'bankStatement', maxCount: 1 },
//     { name: 'nationalInsurance', maxCount: 1 },
//     { name: 'profilePhoto', maxCount: 1 },
//     { name: 'taxiDriverLicense', maxCount: 1 },
//     { name: 'vehicleInsuranceCertificate', maxCount: 1 },
//     { name: 'taxiPlateLicense', maxCount: 1 },
//     { name: 'vehicleRegistration', maxCount: 1 }
//   ])(req, res, (err) => {
//     if (err) {
//       console.error('Error uploading files:', err);
//       return res.status(500).json({ message: 'Error uploading files' });
//     }
//     res.json({
//       message: 'Documents uploaded successfully',
//       files: req.files
//     });
//   });
// });
//
// Uncomment and adjust the above code when you're ready to handle multiple file fields.
// ----------------------------------------------

module.exports = router;
