const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminRideController = require('../controllers/adminRideController');

// Driver management
router.get('/drivers', adminController.getAllDrivers);

// Ride management
router.get('/rides', adminRideController.getAllRides);
router.post('/rides/assign', adminRideController.assignDriver);
router.post('/rides/cancel', adminRideController.cancelRide);

module.exports = router;
