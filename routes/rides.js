console.log('Attempting to load middleware...');
const path = require('path');
const authenticateToken = require('./middleware'); // Use relative path as middleware.js is in the same folder
console.log('Middleware loaded successfully.');

const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection

// Request a Ride
router.post('/request', authenticateToken, (req, res) => {
    const { pickupLocation, destination } = req.body;
    const riderId = req.user.id; // Extracted from JWT

    console.log('Ride request received:', { pickupLocation, destination, riderId });

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

// View Available Rides
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

// Cancel a Ride
router.post('/cancel', authenticateToken, (req, res) => {
    const userId = req.user.id; // Extract user ID from the token
    const userRole = req.user.role; // Extract user role from the token
    const { rideId } = req.body;

    console.log(`Cancellation request by user: ${userId} (Role: ${userRole}) for Ride ID: ${rideId}`);

    // Fetch the ride from the database
    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const ride = results[0];

        // Validate that the user is allowed to cancel
        if (userRole === 'rider' && ride.rider_id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
        }
        if (userRole === 'driver' && ride.driver_id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
        }

        // Prevent cancellation for in-progress or completed rides
        if (['in_progress', 'completed'].includes(ride.status)) {
            return res.status(400).json({ message: 'Cannot cancel a ride that is in progress or completed' });
        }

        // Update ride status to canceled
        db.query('UPDATE rides SET status = ? WHERE id = ?', ['canceled', rideId], (err) => {
            if (err) {
                console.error('Error updating ride status:', err.message);
                return res.status(500).json({ message: 'Error canceling ride' });
            }

            console.log(`Ride ID: ${rideId} successfully canceled by user: ${userId}`);
            res.json({ message: 'Ride canceled successfully' });
        });
    });
});


// View Ride History
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.id; // Extract user ID from token
    const userRole = req.user.role; // Extract user role from token

    console.log('Fetching ride history for user:', { userId, role: userRole });

    let query, params;
    if (userRole === 'rider') {
        query = 'SELECT * FROM rides WHERE rider_id = ?';
        params = [userId];
    } else if (userRole === 'driver') {
        query = 'SELECT * FROM rides WHERE driver_id = ?';
        params = [userId];
    } else {
        return res.status(403).json({ message: 'Forbidden: Invalid role' });
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error while fetching ride history:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        console.log('Ride history fetched:', results);
        res.json(results);
    });
});

// Ensure this is at the very end of the file
module.exports = router;

