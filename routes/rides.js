const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, verifyDriver } = require('./middleware');
const axios = require('axios');
const { getWeekStartAndEnd } = require('../utils/dateUtils');
const stripe = require('stripe')('sk_test_51QUBlfL02n57NqWa21vCRIFtWiWRVkRNBGUkGjyRRfhORqzoTGQNHEu9tULCtUXdcD9N6tGurD8zBtjHVb5zjF7n00DB3wwYp0');


router.post('/preview', authenticateToken, async (req, res) => {
    const { pickupLocation, destination } = req.body;

    if (!pickupLocation || !destination) {
        return res.status(400).json({ message: 'Pickup and destination locations are required.' });
    }

    try {
        console.log(`Previewing ride from ${pickupLocation} to ${destination}`);

        // Call Google Maps Distance Matrix API
        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
                origins: pickupLocation,
                destinations: destination,
                key: process.env.GOOGLE_MAPS_API_KEY,
                mode: 'driving'
            }
        });

        const data = response.data;
        console.log('Google Maps API response:', JSON.stringify(data, null, 2));

        // Check the status of the element
        const elementStatus = data.rows[0]?.elements[0]?.status;
        if (elementStatus !== 'OK') {
            const errorMessage = data.error_message || `Status from API: ${elementStatus}`;
            return res.status(400).json({ message: errorMessage || 'Unable to calculate distance and duration.' });
        }

        const distance = data.rows[0].elements[0].distance.value / 1000; // Convert meters to kilometers
        const duration = data.rows[0].elements[0].duration.text;

        // Calculate fare
        const baseFare = 2.5;
        const farePerKm = 1.2;
        const estimatedFare = (baseFare + distance * farePerKm).toFixed(2);

        // Respond with preview data (using the pound sign for currency)
        res.json({
            pickupLocation,
            destination,
            distance: `${distance.toFixed(2)} km`,
            duration,
            estimatedFare: `£${estimatedFare}`
        });
    } catch (error) {
        console.error('Error during ride preview:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to preview ride.' });
    }
});

//request a ride
router.post('/request', authenticateToken, async (req, res) => {
    const { pickupLocation, destination } = req.body;
    const riderId = req.user.id;
    const userRole = req.user.role;

    // Only riders can request rides
    if (userRole !== 'rider') {
        return res.status(403).json({ message: 'Forbidden: Only riders can request rides' });
    }

    console.log(`Requesting ride from ${pickupLocation} to ${destination} by Rider ID: ${riderId}`);

    try {
        // Check if the rider already has a ride in progress
        const checkQuery = 'SELECT id FROM rides WHERE rider_id = ? AND status IN (?, ?, ?)';
        const statuses = ['requested', 'accepted', 'in_progress'];

        db.query(checkQuery, [riderId, ...statuses], (err, results) => {
            if (err) {
                console.error('Error checking existing rides:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'Unable to request new ride' });
            }

            // Call Google Distance Matrix API
            axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
                params: {
                    origins: pickupLocation,
                    destinations: destination,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                    mode: 'driving'
                },
            })
            .then((response) => {
                const data = response.data;
                // Log the full API response for debugging
                console.log('Google Distance Matrix API response:', JSON.stringify(data, null, 2));

                // Check for valid overall API status
                if (data.status !== 'OK') {
                    console.error('Distance Matrix API returned error status:', data.status);
                    return res.status(400).json({ message: 'Unable to calculate distance. Please check locations.' });
                }

                // Validate that the response has the expected structure
                if (!data.rows || !data.rows[0] || !data.rows[0].elements || !data.rows[0].elements[0]) {
                    console.error('Unexpected API response structure:', data);
                    return res.status(400).json({ message: 'Unexpected API response structure.' });
                }

                // Check if the specific element returned a valid result
                const elementStatus = data.rows[0].elements[0].status;
                if (elementStatus !== 'OK') {
                    console.error('API element status not OK:', elementStatus);
                    const errorMessage = data.error_message || 'Unable to calculate distance. Please check locations.';
                    return res.status(400).json({ message: errorMessage });
                }

                // Extract distance and calculate fare
                const distanceInMeters = data.rows[0].elements[0].distance.value; // in meters
                const distanceInKm = distanceInMeters / 1000; // convert to kilometers
                const baseFare = 2.5; // Base fare
                const farePerKm = 1.2; // Fare per kilometer
                const estimatedFare = baseFare + distanceInKm * farePerKm;

                console.log(`Calculated distance: ${distanceInKm.toFixed(2)} km, Estimated Fare: £${estimatedFare.toFixed(2)}`);

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
                            estimatedFare: `£${estimatedFare.toFixed(2)}`,
                        });
                    }
                );
            })
            .catch((error) => {
                console.error('Error calling Distance Matrix API:', error.response ? error.response.data : error.message);
                res.status(500).json({ message: 'Error calculating distance.' });
            });
        });
    } catch (error) {
        console.error('Error processing ride request:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});





// View Available Rides
router.get('/available', authenticateToken, verifyDriver, (req, res) => {
    // Ensure the user is a driver
    if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Forbidden: Only drivers can view available rides.' });
    }

    db.query('SELECT * FROM rides WHERE status = "requested"', (err, results) => {
        if (err) {
            console.error('Database error while fetching available rides:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});
// Accept a Ride
router.post('/accept', authenticateToken, verifyDriver, async (req, res) => {
    console.log('Accept endpoint hit'); // Debugging

    const { rideId } = req.body;
    const driverId = req.user.id;

    if (!rideId) {
        console.log('Missing rideId in request body:', req.body); // Debugging
        return res.status(400).json({ message: 'rideId is required' });
    }

    console.log(`Attempting to accept ride with ID: ${rideId} by driver: ${driverId}`); // Debugging

    try {
        db.query(
            'UPDATE rides SET status = "accepted", driver_id = ? WHERE id = ? AND status = "requested"',
            [driverId, rideId],
            (err, results) => {
                if (err) {
                    console.error('Database error while accepting ride:', err.message); // Debugging
                    return res.status(500).json({ message: 'Database error' });
                }

                console.log('Database update results:', results); // Debugging

                if (results.affectedRows === 0) {
                    console.log(`Ride not found or already accepted: ID ${rideId}`); // Debugging
                    return res.status(404).json({ message: 'Ride not found or already accepted.' });
                }

                res.json({ message: 'Ride accepted successfully.', rideId });
            }
        );
    } catch (error) {
        console.error('Unexpected error in /accept endpoint:', error.message); // Debugging
        res.status(500).json({ message: 'Unexpected server error.' });
    }
});


// GET /rides/accepted-ride-details?rideId=...
router.get('/accepted-ride-details', authenticateToken, (req, res) => {
    const { rideId } = req.query;
    const riderId = req.user.id;
    
    // Verify that the ride belongs to the rider and is accepted/in_progress/completed.
    const rideQuery = `
      SELECT * FROM rides 
      WHERE id = ? AND rider_id = ? AND status IN ('accepted', 'in_progress', 'completed')
    `;
    db.query(rideQuery, [rideId, riderId], (err, rides) => {
      if (err) {
        console.error('Database error fetching ride:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (rides.length === 0) {
        return res.status(404).json({ message: 'Ride not found' });
      }
      const ride = rides[0];
      const driverId = ride.driver_id;
      
      // Now, retrieve the driver's average rating.
      db.query(
        "SELECT AVG(rating) AS avgRating, COUNT(*) AS totalRatings FROM ratings WHERE ratee_id = ?",
        [driverId],
        (err, ratingResults) => {
          if (err) {
            console.error('Error fetching ratings:', err);
            return res.status(500).json({ message: 'Error retrieving ratings' });
          }
          ride.driverRating = ratingResults[0]; // Attach rating info to the ride details.
          res.json(ride);
        }
      );
    });
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

    // Fetch ride details
    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Ride not found' });

        const ride = results[0];
        if (ride.payment_status === 'processed') {
            return res.status(400).json({ message: 'Payment already processed for this ride' });
        }

        if (ride.fare !== amount) {
            return res.status(400).json({ message: 'Incorrect payment amount' });
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

    db.query('SELECT payment_intent_id, fare FROM rides WHERE id = ?', [rideId], (err, results) => {
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

                        // Correctly calculate weekly earnings
                        const currentDate = new Date(); // Always use the current date
                        const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd(currentDate);

                        console.log(
                            `Updating weekly earnings for week start: ${formattedWeekStart} and end: ${formattedWeekEnd}`
                        );

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


// Process Payment (Mocked for Testing)
router.post('/payment', authenticateToken, (req, res) => {
    const { rideId, amount } = req.body;
    const userId = req.user.id;

    // Fetch ride details
    db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Ride not found' });

        const ride = results[0];
        if (ride.payment_status === 'processed') {
            return res.status(400).json({ message: 'Payment already processed for this ride' });
        }

        if (ride.fare !== amount) {
            return res.status(400).json({ message: 'Incorrect payment amount' });
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

//driver signup
router.post('/driver-signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        'INSERT INTO users (username, email, password, role, verified) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, 'driver', false], // Default verified to false
        (err, results) => {
            if (err) {
                console.error('Error inserting driver:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }

            res.status(201).json({ message: 'Driver registered successfully. Await admin verification.' });
        }
    );
});

// Verify Driver (Admin Only)
router.post('/verify-driver', authenticateToken, async (req, res) => {
    const { driverId } = req.body;

    // Ensure the user making the request is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access only.' });
    }

    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required.' });
    }

    try {
        // Update the driver's verified status
        db.query(
            'UPDATE users SET verified = ? WHERE id = ? AND role = ?',
            [true, driverId, 'driver'],
            (err, results) => {
                if (err) {
                    console.error('Error verifying driver:', err.message);
                    return res.status(500).json({ message: 'Database error during verification.' });
                }

                if (results.affectedRows === 0) {
                    return res.status(404).json({ message: 'Driver not found or already verified.' });
                }

                res.json({ message: 'Driver verified successfully.', driverId });
            }
        );
    } catch (error) {
        console.error('Error during driver verification:', error.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
});



module.exports = router;

// Example Stripe Payment Integration 


// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// /**
//  * Endpoint: POST /create-payment-intent
//  *
//  * Expects a JSON body with:
//  * - rideId: the ID of the ride being paid for.
//  * - amount: the amount to charge in the smallest currency unit (e.g., cents).
//  *
//  * This endpoint creates a PaymentIntent using Stripe and returns the client secret.
//  */
// router.post('/create-payment-intent', authenticateToken, async (req, res) => {
//   try {
//     const { rideId, amount } = req.body;
    
//     // Create a PaymentIntent with the specified amount and currency (e.g., USD).
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount, // Amount in cents (or your smallest currency unit)
//       currency: 'usd', // Adjust as needed
//       metadata: { rideId } // Optionally attach metadata for later reference
//     });
    
//     res.status(200).json({
//       message: 'Payment intent created successfully',
//       clientSecret: paymentIntent.client_secret
//     });
//   } catch (error) {
//     console.error('Error creating payment intent:', error);
//     res.status(500).json({ error: 'Failed to create payment intent' });
//   }
// });
