// controllers/rideActiveController.js
const db = require('../db');

exports.getActiveRide = (req, res) => {
  const userId = req.user.id; // The authentication middleware should set req.user

  // Query for a ride where the current user (rider) has an active ride.
  // Here we consider "requested", "accepted", or "in progress" as active statuses.
  db.query(
    'SELECT * FROM rides WHERE rider_id = ? AND status IN ("requested", "accepted", "arrived", "in progress") LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ message: 'Database error' });
      }
      if (results.length === 0) {
        return res.json(null); // No active ride found
      }
      return res.json(results[0]);
    }
  );
};
