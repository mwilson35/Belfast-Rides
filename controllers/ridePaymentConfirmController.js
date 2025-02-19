const db = require('../db');

exports.confirmPayment = (req, res) => {
  const { rideId } = req.body;
  const userId = req.user.id;

  // Fetch ride details (and payment intent) from the database.
  db.query('SELECT payment_intent_id, fare FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Ride not found or paymentIntentId missing' });
    }

    const paymentIntentId = results[0]?.payment_intent_id;
    if (!paymentIntentId) {
      return res.status(400).json({ message: 'PaymentIntentId not found for this ride' });
    }

    // Simulate a successful payment confirmation.
    const mockStatus = 'succeeded';
    if (mockStatus !== 'succeeded') {
      return res.status(400).json({ message: `Mock payment confirmation failed. Status: ${mockStatus}` });
    }

    // Update the ride's payment status to "processed".
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
};
