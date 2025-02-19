const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, verifyDriver } = require('./middleware');
const axios = require('axios');
const { getWeekStartAndEnd } = require('../utils/dateUtils');
const stripe = require('stripe')('sk_test_51QUBlfL02n57NqWa21vCRIFtWiWRVkRNBGUkGjyRRfhORqzoTGQNHEu9tULCtUXdcD9N6tGurD8zBtjHVb5zjF7n00DB3wwYp0');

const ridePreviewController = require('../controllers/ridePreviewController');
const rideRequestController = require('../controllers/rideRequestController');
const rideAvailableController = require('../controllers/rideAvailableController');
const rideAcceptController = require('../controllers/rideAcceptController');
const rideAcceptedDetailsController = require('../controllers/rideAcceptedDetailsController');
const rideCancelController = require('../controllers/rideCancelController');
const ridePaymentController = require('../controllers/ridePaymentController'); 
const ridePaymentConfirmController = require('../controllers/ridePaymentConfirmController');
const rideCompleteController = require('../controllers/rideCompleteController');

//ride preview 
router.post('/preview', authenticateToken, ridePreviewController.previewRide);
//request a ride
router.post('/request', authenticateToken, rideRequestController.requestRide);
//preview available rides
router.get('/available', authenticateToken, verifyDriver, rideAvailableController.getAvailableRides);
//accept a ride
router.post('/accept', authenticateToken, verifyDriver, rideAcceptController.acceptRide);
//driver rating display after accepting a ride
router.get('/accepted-ride-details', authenticateToken, rideAcceptedDetailsController.getAcceptedRideDetails);
//cancel a ride 
router.post('/cancel', authenticateToken, rideCancelController.cancelRide);
//payment
router.post('/payment', authenticateToken, ridePaymentController.processPayment);
//confirm payment
router.post('/payment/confirm', authenticateToken, ridePaymentConfirmController.confirmPayment);
//complete a ride 
router.post('/complete', authenticateToken, rideCompleteController.completeRide);

    


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
