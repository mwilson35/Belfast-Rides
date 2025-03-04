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
const earningsController = require('../controllers/earningsController');
const rideHistoryController = require('../controllers/rideHistoryController');
const driverSignupController = require('../controllers/driverSignupController');
const driverVerificationController = require('../controllers/driverVerificationController');
const ratingController = require('../controllers/ratingController');
const rideStartController = require('../controllers/rideStartController');
const rideActiveController = require('../controllers/rideActiveController');

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
//start ride
router.post('/start', authenticateToken, verifyDriver, rideStartController.startRide);
//payment
router.post('/payment', authenticateToken, ridePaymentController.processPayment);
//confirm payment
router.post('/payment/confirm', authenticateToken, ridePaymentConfirmController.confirmPayment);
//complete a ride 
router.post('/complete', authenticateToken, rideCompleteController.completeRide);
// fetch weekly earnings 
router.get('/earnings', authenticateToken, earningsController.getWeeklyEarnings);
//ride history
router.get('/history', authenticateToken, rideHistoryController.getRideHistory);
//driver signup
router.post('/driver-signup', driverSignupController.signupDriver);
//driver verification by admin
router.post('/verify-driver', authenticateToken, driverVerificationController.verifyDriver);
//active ride 
router.get('/active', authenticateToken, rideActiveController.getActiveRide);

// In routes/rides.js (add this near your other test endpoints)
router.post('/test-driver-arrived', authenticateToken, (req, res) => {
    const io = req.app.get('io');
    const { rideId } = req.body;
    if (!rideId) {
      return res.status(400).json({ message: 'rideId is required' });
    }
    io.emit('driverArrived', { rideId, message: 'Driver has arrived (test event)' });
    res.json({ message: 'driverArrived event emitted' });
  });
  

  router.post('/test-ride-in-progress', authenticateToken, (req, res) => {
    const io = req.app.get('io');
    const { rideId } = req.body;
    if (!rideId) {
      return res.status(400).json({ message: 'rideId is required' });
    }
    io.emit('rideInProgress', { rideId, message: 'Ride is now in progress (test event)' });
    res.json({ message: 'rideInProgress event emitted' });
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
