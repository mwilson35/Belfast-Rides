console.log('rides.js loaded successfully'); // Debug log for file loading

const express = require('express');
const router = express.Router();
const authenticateToken = require('./middleware'); // Import middleware

console.log('Middleware type:', typeof authenticateToken); // Check if middleware is a function


let rides = []; // Temporary in-memory storage for ride data

// Request a Ride (Protected Route)
router.post('/request', authenticateToken, (req, res) => {
    console.log('Ride request route hit'); // Debug log to confirm route access
    const { pickupLocation, destination, riderUsername } = req.body;

    const newRide = {
        id: rides.length + 1,
        pickupLocation,
        destination,
        riderUsername,
        status: 'requested',
    };

    rides.push(newRide);
    res.status(201).json({ message: 'Ride requested successfully', ride: newRide });
});

// View Available Rides for Drivers (Unprotected Route for Demo)
router.get('/available', (req, res) => {
    console.log('View available rides route hit'); // Debug log to confirm route access
    const availableRides = rides.filter(ride => ride.status === 'requested');
    res.json(availableRides);
});

// Accept a Ride (Protected Route for Drivers)
router.post('/accept', authenticateToken, (req, res) => {
    console.log('Ride accept route hit'); // Debug log to confirm route access
    const { rideId, driverUsername } = req.body;

    const ride = rides.find(ride => ride.id === rideId);
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }

    // Update ride status and assign a driver
    ride.status = 'accepted';
    ride.driverUsername = driverUsername;

    res.json({ message: 'Ride accepted', ride });
});

module.exports = router;
