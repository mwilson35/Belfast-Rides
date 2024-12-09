const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection
const authenticateToken = require('./middleware'); // Middleware in the same folder

// Accept a Ride
router.post('/accept', authenticateToken, (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user.id; // Extracted from JWT

    console.log('Driver attempting to accept ride:', { rideId, driverId });

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
            console.log('Ride successfully accepted by driver:', driverId);
            res.json({ message: 'Ride accepted', rideId });
        }
    );
});

// Cancel a Ride (Driver-Specific Validation)
router.post('/cancel', authenticateToken, (req, res) => {
    const userId = req.user.id; // Extract user ID from the token
    const userRole = req.user.role; // Extract user role from the token
    const { rideId } = req.body;

    console.log(`Cancellation request by ${userRole} (User ID: ${userId}) for Ride ID: ${rideId}`);

    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Database error or ride not found:', err?.message || 'No results');
            return res.status(404).json({ message: 'Ride not found' });
        }

        const ride = results[0];

        // Validate cancellation rights for drivers
        if (userRole === 'driver' && ride.driver_id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
        }

        // Prevent cancellation for completed rides
        if (ride.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed ride' });
        }

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

// Complete a Ride
router.post('/complete', authenticateToken, (req, res) => {
    const userId = req.user.id; // Extract user ID from the token
    const userRole = req.user.role; // Extract user role from the token
    const { rideId } = req.body;

    console.log(`Completion request by user: ${userId} (Role: ${userRole}) for Ride ID: ${rideId}`);

    if (userRole !== 'driver') {
        return res.status(403).json({ message: 'Forbidden: Only drivers can complete rides' });
    }

    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Database error or ride not found:', err?.message || 'No results');
            return res.status(404).json({ message: 'Ride not found' });
        }

        const ride = results[0];

        if (ride.driver_id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You cannot complete this ride' });
        }

        if (!['accepted', 'in_progress'].includes(ride.status)) {
            return res.status(400).json({ message: 'Cannot complete a ride that is not in progress or accepted' });
        }

        db.query('UPDATE rides SET status = ? WHERE id = ?', ['completed', rideId], (err) => {
            if (err) {
                console.error('Error updating ride status:', err.message);
                return res.status(500).json({ message: 'Error completing ride' });
            }
            console.log(`Ride ID: ${rideId} successfully completed by driver: ${userId}`);
            res.json({ message: 'Ride completed successfully' });
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
        if (results.length === 0) {
            console.log('No rides found for user:', { userId, role: userRole });
            return res.json({ message: 'No ride history available.' });
        }
        console.log('Ride history fetched:', results);
        res.json(results);
    });
});


module.exports = router;
