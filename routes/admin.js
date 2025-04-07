const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/drivers', adminController.getAllDrivers);

module.exports = router;
