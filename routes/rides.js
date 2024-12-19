const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('./middleware');
const axios = require('axios');
const { getWeekStartAndEnd } = require('../dateUtils');
const stripe = require('stripe')('sk_test_51QUBlfL02n57NqWa21vCRIFtWiWRVkRNBGUkGjyRRfhORqzoTGQNHEu9tULCtUXdcD9N6tGurD8zBtjHVb5zjF7n00DB3wwYp0');

// Request a Ride
router.post('/request', authenticateToken, async (req, res) => {
    const { pickupLocation, destination } = req.body;
    const riderId = req.user.id;

    console.log(`Requesting ride from ${pickupLocation} to ${destination} by Rider ID: ${riderId}`);

    try {
        // Call Google Distance Matrix API
        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
                origins: pickupLocation,
                destinations: destination,
                key: process.env.GOOGLE_MAPS_API_KEY,
            },
        });

        const data = response.data;

        // Check for valid response
        if (data.status !== 'OK' || data.rows[0].elements[0].status !== 'OK') {
            return res.status(400).json({ message: 'Unable to calculate distance. Please check locations.' });
        }

        const distanceInMeters = data.rows[0].elements[0].distance.value; // Distance in meters
        const distanceInKm = distanceInMeters / 1000; // Convert to kilometers
        const baseFare = 2.5; // Example base fare
        const farePerKm = 1.2; // Example fare per kilometer
        const estimatedFare = baseFare + distanceInKm * farePerKm;

        console.log(`Calculated distance: ${distanceInKm.toFixed(2)} km, Estimated Fare: $${estimatedFare.toFixed(2)}`);

        // Insert the ride into the database
        db.query(
            'INSERT INTO rides (pickup_location, destination, rider_id, distance, estimated_fare, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [pickupLocation, destination, riderId, distanceInKm, estimatedFare, 'requested', 'pending'],
            (err, results) => {
                if (err) {
                    console.error('Database error while requesting ride:', err.message);
                    return res.status(500).json({ message: 'Database error' });
                }

                console.log('Ride successfully requested with ID:', results.insertId);
                res.status(201).json({
                    message: 'Ride requested successfully',
                    rideId: results.insertId,
                    distance: `${distanceInKm.toFixed(2)} km`,
                    estimatedFare: `$${estimatedFare.toFixed(2)}`,
                });
            }
        );
    } catch (error) {
        console.error('Error calculating distance or requesting ride:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
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
    const driverId = req.user.id;

    db.query(
        'UPDATE rides SET status = "accepted", driver_id = ? WHERE id = ? AND status = "requested"',
        [driverId, rideId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.affectedRows === 0) return res.status(404).json({ message: 'Ride not found or already accepted' });
            res.json({ message: 'Ride accepted', rideId });
        }
    );
});

// Cancel a Ride
router.post('/cancel', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { rideId } = req.body;

    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Ride not found' });

        const ride = results[0];
        if (
            (userRole === 'rider' && ride.rider_id !== userId) ||
            (userRole === 'driver' && ride.driver_id !== userId)
        ) {
            return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
        }

        if (ride.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed ride' });
        }

        db.query('UPDATE rides SET status = ? WHERE id = ?', ['canceled', rideId], (err) => {
            if (err) return res.status(500).json({ message: 'Error canceling ride' });
            res.json({ message: 'Ride canceled successfully' });
        });
    });
});

// Process Payment (Mocked for Testing)
router.post('/payment', authenticateToken, (req, res) => {
    const { rideId, amount } = req.body;
    const userId = req.user.id;

    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Ride not found' });

        const ride = results[0];
        if (ride.payment_status === 'processed') {
            return res.status(400).json({ message: 'Payment already processed for this ride' });
        }

        const mockPaymentIntentId = `pi_mock_${rideId}`;
        db.query(
            'UPDATE rides SET payment_intent_id = ?, payment_status = ? WHERE id = ?',
            [mockPaymentIntentId, 'pending', rideId],
            (err) => {
                if (err) return res.status(500).json({ message: 'Database error' });
                res.json({ message: 'Mock payment intent created', clientSecret: mockPaymentIntentId });
            }
        );
    });
});

// Confirm Payment (Mocked for Testing)
router.post('/payment/confirm', authenticateToken, (req, res) => {
    const { rideId } = req.body;
    const userId = req.user.id;

    db.query('SELECT payment_intent_id FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Ride not found or paymentIntentId missing' });

        const paymentIntentId = results[0]?.payment_intent_id;
        if (!paymentIntentId) return res.status(400).json({ message: 'PaymentIntentId not found for this ride' });

        const mockStatus = 'succeeded';
        if (mockStatus !== 'succeeded') {
            return res.status(400).json({ message: `Mock payment confirmation failed. Status: ${mockStatus}` });
        }

        db.query(
            'UPDATE rides SET payment_status = ? WHERE id = ?',
            ['processed', rideId],
            (err, results) => {
                if (err || results.affectedRows === 0) {
                    return res.status(500).json({ message: 'Database update failed: No rows affected' });
                }
                res.json({ message: 'Mock payment confirmed successfully' });
            }
        );
    });
});

// Complete a Ride
const { calculateFare } = require('../utils/fareUtils'); // Import the centralized fare calculation function

router.post('/complete', authenticateToken, (req, res) => {
    const userId = req.user.id; // Extract user ID from the token
    const userRole = req.user.role; // Extract user role from the token
    const { rideId } = req.body;

    console.log(`Completion request by user: ${userId} (Role: ${userRole}) for Ride ID: ${rideId}`);

    if (userRole !== 'driver') {
        return res.status(403).json({ message: 'Forbidden: Only drivers can complete rides' });
    }

    // Fetch ride details and validate
    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err) {
            console.error('Database error while fetching ride details:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const ride = results[0];

        if (ride.driver_id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You cannot complete this ride' });
        }

        if (ride.status === 'completed') {
            return res.status(400).json({ message: 'Ride is already completed' });
        }

        if (!['accepted', 'in_progress'].includes(ride.status)) {
            return res.status(400).json({ message: 'Cannot complete a ride that is not in progress or accepted' });
        }

        // Calculate fare using centralized function
        const pricing = {
            base_fare: 2.5,
            per_km_rate: 1.2,
            surge_multiplier: ride.surge_multiplier || 1.0 // Optional surge multiplier
        };

        const fare = calculateFare(ride.distance || 0, pricing); // Use 0 if distance is not available

        // Update the ride's status and fare in the database
        db.query(
            'UPDATE rides SET status = ?, fare = ?, payment_status = ? WHERE id = ?',
            ['completed', fare, 'processed', rideId],
            (err) => {
                if (err) {
                    console.error('Error updating ride details in rides table:', err.message);
                    return res.status(500).json({ message: 'Database error' });
                }

                console.log(`Ride ID: ${rideId} successfully completed by driver: ${userId}, Fare: ${fare}`);

                // Insert earnings into driver_earnings table
                db.query(
                    'INSERT INTO driver_earnings (driver_id, ride_id, amount) VALUES (?, ?, ?)',
                    [userId, rideId, fare],
                    (err) => {
                        if (err) {
                            console.error('Error updating driver earnings:', err.message);
                            return res.status(500).json({ message: 'Error updating driver earnings' });
                        }

                        console.log(`Earnings updated for Driver ID: ${userId}, Ride ID: ${rideId}, Amount: ${fare}`);

                        // Update weekly earnings table
                        const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd();
                        db.query(
                            `INSERT INTO weekly_earnings (driver_id, week_start, week_end, total_earnings)
                             VALUES (?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE total_earnings = total_earnings + ?`,
                            [userId, formattedWeekStart, formattedWeekEnd, fare, fare],
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


// Fetch Weekly Earnings
router.get('/earnings', authenticateToken, (req, res) => {
    const driverId = req.user.id;
    const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd();

    db.query(
        `SELECT SUM(total_earnings) AS total_earnings 
         FROM weekly_earnings 
         WHERE driver_id = ? AND week_start = ? AND week_end = ?`,
        [driverId, formattedWeekStart, formattedWeekEnd],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            const totalEarnings = results[0]?.total_earnings || 0;
            res.json({
                message: totalEarnings > 0 ? 'Weekly earnings fetched successfully' : 'No earnings found for the current week',
                totalEarnings,
            });
        }
    );
});

// View Ride History
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

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
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results.length ? results : { message: 'No ride history available.' });
    });
});

module.exports = router;
