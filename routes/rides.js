console.log('Attempting to load middleware...');
const authenticateToken = require('./middleware'); // Middleware in the same folder
console.log('Middleware loaded successfully.');

const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection
const stripe = require('stripe')('sk_test_51QUBlfL02n57NqWa21vCRIFtWiWRVkRNBGUkGjyRRfhORqzoTGQNHEu9tULCtUXdcD9N6tGurD8zBtjHVb5zjF7n00DB3wwYp0'); // Replace with your secret key

// Request a Ride
router.post('/request', authenticateToken, (req, res) => {
    const { pickupLocation, destination } = req.body;
    const riderId = req.user.id; // Extracted from JWT

    console.log('Ride request received:', { pickupLocation, destination, riderId });

    db.query(
        'INSERT INTO rides (pickup_location, destination, rider_id, status, payment_status) VALUES (?, ?, ?, ?, ?)',
        [pickupLocation, destination, riderId, 'requested', 'pending'],
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

    console.log(`Cancellation request by ${userRole} (User ID: ${userId}) for Ride ID: ${rideId}`);

    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Database error or ride not found:', err?.message || 'No results');
            return res.status(404).json({ message: 'Ride not found' });
        }

        const ride = results[0];

        // Validate cancellation rights
        if (
            (userRole === 'rider' && ride.rider_id !== userId) ||
            (userRole === 'driver' && ride.driver_id !== userId)
        ) {
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

        // Calculate fare if distance exists, otherwise use base fare
        const baseFare = 2.5;
        const farePerKm = 1.2;
        const fare = ride.distance ? baseFare + ride.distance * farePerKm : baseFare;

        db.query(
            'UPDATE rides SET status = ?, fare = ?, payment_status = ? WHERE id = ?',
            ['completed', fare, 'processed', rideId],
            (err) => {
                if (err) {
                    console.error('Error updating ride details in rides table:', err.message);
                    return res.status(500).json({ message: 'Database error' });
                }

                console.log(`Ride ID: ${rideId} successfully completed by driver: ${userId}, Fare: ${fare}`);

                // Insert into driver earnings
                db.query(
                    'INSERT INTO driver_earnings (driver_id, ride_id, amount) VALUES (?, ?, ?)',
                    [userId, rideId, fare],
                    (err) => {
                        if (err) {
                            console.error('Error updating driver earnings:', err.message);
                            return res.status(500).json({ message: 'Error updating driver earnings' });
                        }

                        console.log(`Earnings updated for Driver ID: ${userId}, Ride ID: ${rideId}, Amount: ${fare}`);

                        // Update weekly earnings
                        const weekStart = new Date();
                        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Start of the week (Monday)
                        weekStart.setHours(0, 0, 0, 0);

                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6); // End of the week (Sunday)
                        weekEnd.setHours(23, 59, 59, 999);

                        db.query(
                            `INSERT INTO weekly_earnings (driver_id, week_start, week_end, total_earnings)
                             VALUES (?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE total_earnings = total_earnings + ?`,
                            [userId, weekStart, weekEnd, fare, fare],
                            (err) => {
                                if (err) {
                                    console.error('Error updating weekly earnings:', err.message);
                                    return res.status(500).json({ message: 'Error updating weekly earnings' });
                                }

                                console.log(`Weekly earnings updated for Driver ID: ${userId}`);
                                res.json({ message: 'Ride completed successfully', fare });
                            }
                        );
                    }
                );
            }
        );
    });
});


// Fetch Weekly Earnings for Driver
router.get('/earnings', authenticateToken, (req, res) => {
    const driverId = req.user.id; // Extract driver ID from token

    console.log(`Fetching weekly earnings for Driver ID: ${driverId}`);

    // Calculate week start (Sunday) and week end (Saturday)
    const weekStart = new Date();
weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of the week (Sunday)
weekStart.setHours(0, 0, 0, 0); // Reset time
const formattedWeekStart = weekStart.toISOString().slice(0, 10);

const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6); // End of the week (Saturday)
weekEnd.setHours(23, 59, 59, 999); // Reset time
const formattedWeekEnd = weekEnd.toISOString().slice(0, 10);

    console.log('Calculated weekStart:', formattedWeekStart);
    console.log('Calculated weekEnd:', formattedWeekEnd);

    // Query to fetch and sum all weekly earnings for the driver
    db.query(
        `SELECT SUM(total_earnings) AS total_earnings 
         FROM weekly_earnings 
         WHERE driver_id = ? AND week_start >= ? AND week_end <= ?`,
        [driverId, formattedWeekStart, formattedWeekEnd],
        (err, results) => {
            if (err) {
                console.error('Database error while fetching weekly earnings:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }

            // Handle no earnings case
            const totalEarnings = results[0]?.total_earnings || 0;
            if (totalEarnings === 0) {
                console.log(`No weekly earnings found for Driver ID: ${driverId}`);
                return res.json({ message: 'No earnings found for the current week', totalEarnings });
            }

            console.log(`Weekly earnings for Driver ID ${driverId}: ${totalEarnings}`);
            res.json({
                message: 'Weekly earnings fetched successfully',
                totalEarnings,
            });
        }
    );
});





// Utility function to calculate fare (mock example)
function calculateFare(distance) {
    const baseFare = 2.5; // Base fare
    const perKmRate = 1.2; // Fare per km
    return baseFare + distance * perKmRate;
}

// Process Payment (Mocked for Testing)
router.post('/payment', authenticateToken, async (req, res) => {
    const { rideId, amount } = req.body;
    const userId = req.user.id; // Extract user ID from token

    console.log(`Processing payment for Ride ID: ${rideId} by User ID: ${userId} with Amount: ${amount}`);

    // Validate ride existence and payment status
    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Database error or ride not found:', err?.message || 'No results');
            return res.status(404).json({ message: 'Ride not found' });
        }

        const ride = results[0];
        if (ride.payment_status === 'processed') {
            return res.status(400).json({ message: 'Payment already processed for this ride' });
        }

        // Simulate creating a payment intent
        const mockPaymentIntentId = `pi_mock_${rideId}`;
        console.log(`Mock payment intent created: ${mockPaymentIntentId}`);

        // Save mock paymentIntentId to the database
        db.query(
            'UPDATE rides SET payment_intent_id = ?, payment_status = ? WHERE id = ?',
            [mockPaymentIntentId, 'pending', rideId],
            (err) => {
                if (err) {
                    console.error('Error saving mock paymentIntentId to the database:', err.message);
                    return res.status(500).json({ message: 'Database error' });
                }
                console.log(`Mock payment intent saved for Ride ID: ${rideId}`);
                res.json({
                    message: 'Mock payment intent created',
                    clientSecret: mockPaymentIntentId,
                });
            }
        );
    });
});

// Confirm Payment (Mocked for Testing)
router.post('/payment/confirm', authenticateToken, (req, res) => {
    const { rideId } = req.body;
    const userId = req.user.id; // Extract user ID from token

    console.log(`Confirming payment for Ride ID: ${rideId} by User ID: ${userId}`);

    db.query('SELECT payment_intent_id FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Database error or ride not found:', err?.message || 'No results');
            return res.status(404).json({ message: 'Ride not found or paymentIntentId missing' });
        }

        const paymentIntentId = results[0]?.payment_intent_id;

        if (!paymentIntentId) {
            return res.status(400).json({ message: 'PaymentIntentId not found for this ride' });
        }

        // Simulate confirming a payment intent
        const mockStatus = 'succeeded'; // Simulate a successful payment
        console.log(`Mock payment confirmation for PaymentIntentId: ${paymentIntentId}. Status: ${mockStatus}`);

        if (mockStatus !== 'succeeded') {
            console.log(`Mock payment confirmation failed for PaymentIntentId: ${paymentIntentId}. Status: ${mockStatus}`);
            return res.status(400).json({ message: `Mock payment confirmation failed. Status: ${mockStatus}` });
        }
        // Update payment status in the database
db.query(
    'UPDATE rides SET payment_status = ? WHERE id = ?',
    ['processed', rideId],
    (err, results) => {
        if (err) {
            console.error('Error updating payment status in the database:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }

        // Log the results of the query
        console.log('Database update results:', results);

        if (results.affectedRows === 0) {
            console.log(`No rows were updated for Ride ID: ${rideId}. Possible issue with the query or ride ID.`);
            return res.status(500).json({ message: 'Database update failed: No rows affected' });
        }

        console.log(`Payment status updated to 'processed' for Ride ID: ${rideId}`);
        res.json({ message: 'Mock payment confirmed successfully' });
    }
);
    });
});




// View Ride History
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('Fetching ride history for user:', { userId, role: userRole });

    let query, params;
    if (userRole === 'rider') {
        query = 'SELECT id, pickup_location, destination, status, payment_status, created_at FROM rides WHERE rider_id = ?';
        params = [userId];
    } else if (userRole === 'driver') {
        query = 'SELECT id, pickup_location, destination, status, payment_status, created_at FROM rides WHERE driver_id = ?';
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
