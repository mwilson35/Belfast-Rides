// controllers/ridePaymentController.js

const db = require('../db');

exports.processPayment = (req, res) => {
  const { rideId, amount } = req.body;
  const userId = req.user.id;

  // Fetch ride details
  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

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
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }
        res.json({ message: 'Mock payment intent created', clientSecret: mockPaymentIntentId });
      }
    );
  });
};
