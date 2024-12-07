const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection
const authenticateToken = require('./middleware'); // JWT middleware

// Request a Ride
router.post('/request', authenticateToken, (req, res) => {
    const { pickupLocation, destination } = req.body;
    const riderId = req.user.id; // Extracted from JWT

    db.query(
        'INSERT INTO rides (pickup_location, destination, rider_id) VALUES (?, ?, ?)',
        [pickupLocation, destination, riderId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.status(201).json({ message: 'Ride requested successfully', rideId: results.insertId });
        }
    );
});

// View Available Rides
router.get('/available', (req, res) => {
    db.query('SELECT * FROM rides WHERE status = "requested"', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Accept a Ride
router.post('/accept', authenticateToken, (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user.id; // Extracted from JWT

    // Update ride status and assign the driver
    db.query(
        'UPDATE rides SET status = "accepted", driver_id = ? WHERE id = ? AND status = "requested"',
        [driverId, rideId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Ride not found or already accepted' });
            }
            res.json({ message: 'Ride accepted' });
        }
    );
});

module.exports = router;
