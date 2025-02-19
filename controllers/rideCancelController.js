// controllers/rideCancelController.js

const db = require('../db');

exports.cancelRide = (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { rideId } = req.body;

  // Fetch the ride from the database.
  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = results[0];

    // Check if the user is authorized to cancel this ride.
    if (
      (userRole === 'rider' && ride.rider_id !== userId) ||
      (userRole === 'driver' && ride.driver_id !== userId)
    ) {
      return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
    }

    // Prevent cancellation of a completed ride.
    if (ride.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    }

    // Update the ride's status to "canceled".
    db.query('UPDATE rides SET status = ? WHERE id = ?', ['canceled', rideId], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error canceling ride' });
      }
      res.json({ message: 'Ride canceled successfully' });
    });
  });
};
