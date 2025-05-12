const db = require('../db');

exports.getActiveRide = (req, res) => {
  const userId = req.user.id;

  db.query(
    'SELECT * FROM rides WHERE rider_id = ? AND status IN ("requested", "accepted", "arrived", "in_progress") LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ message: 'Database error' });
      }
      if (results.length === 0) {
        return res.json(null);
      }
      const ride = results[0];

      if (ride.encoded_polyline) {
        ride.route = JSON.parse(ride.encoded_polyline);
      } else {
        console.error("Missing precomputed route in ride record.");
      }

      return res.json(ride);
    }
  );
};
