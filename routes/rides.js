const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection
const authenticateToken = require('./middleware'); // JWT middleware

// Request a Ride
router.post('/request', authenticateToken, (req, res) => {
    const { pickupLocation, destination } = req.body;
    const riderId = req.user.id; // Extracted from JWT

    console.log('Ride request received:', { pickupLocation, destination, riderId });

    // Insert ride request into the database
    db.query(
        'INSERT INTO rides (pickup_location, destination, rider_id) VALUES (?, ?, ?)',
        [pickupLocation, destination, riderId],
        (err, results) => {
            if (err) {
                console.error('Database error while requesting ride:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }
            console.log('Ride successfully requested:', results.insertId);
            res.status(201).json({ message: 'Ride requested successfully', rideId: results.insertId });
        }
    );
});

router.get('/available', (req, res) => {
    console.log('Fetching available rides...');
    db.query('SELECT * FROM rides WHERE status = "requested"', (err, results) => {
        if (err) {
            console.error('Database error while fetching available rides:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        console.log('Available rides fetched:', results);
        res.json(results);
    });
});


// Accept a Ride
router.post('/accept', authenticateToken, (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user.id; // Extracted from JWT

    console.log('Accepting ride:', { rideId, driverId });

    // Update ride status and assign driver
    db.query(
        'UPDATE rides SET status = "accepted", driver_id = ? WHERE id = ? AND status = "requested"',
        [driverId, rideId],
        (err, results) => {
            if (err) {
                console.error('Database error while accepting ride:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }
            if (results.affectedRows === 0) {
                console.log('Ride not found or already accepted:', rideId);
                return res.status(404).json({ message: 'Ride not found or already accepted' });
            }
            console.log('Ride successfully accepted:', rideId);
            res.json({ message: 'Ride accepted', rideId });
        }
    );
});

module.exports = router;
