const db = require('../db');

// In your earnings or rideHistory controller (for riders)
exports.getRideHistory = (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  let query, params;

  if (userRole === 'rider') {
    // Include driver_id so the front end can use it for ratings.
    query = 'SELECT id, pickup_location, destination, status, payment_status, created_at, driver_id FROM rides WHERE rider_id = ?';
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
};
