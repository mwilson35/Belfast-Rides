const db = require('../db');

// View all rides
exports.getAllRides = (req, res) => {
  const query = `
    SELECT r.id, r.pickup_location, r.destination, r.status, r.driver_id, u.username AS driver_name
    FROM rides r
    LEFT JOIN users u ON r.driver_id = u.id
    ORDER BY r.created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching rides:', err.message);
      return res.status(500).json({ message: 'Error fetching rides' });
    }
    res.json(results);
  });
};

// Assign a driver to a ride
exports.assignDriver = (req, res) => {
  const { rideId, driverId } = req.body;

  if (!rideId || !driverId) {
    return res.status(400).json({ message: 'rideId and driverId are required' });
  }

  const query = 'UPDATE rides SET driver_id = ? WHERE id = ?';
  db.query(query, [driverId, rideId], (err) => {
    if (err) {
      console.error('Error assigning driver:', err.message);
      return res.status(500).json({ message: 'Failed to assign driver' });
    }
    res.json({ message: 'Driver assigned successfully' });
  });
};

// Cancel a ride
exports.cancelRide = (req, res) => {
  const { rideId } = req.body;

  if (!rideId) {
    return res.status(400).json({ message: 'rideId is required' });
  }

  const query = 'UPDATE rides SET status = "cancelled" WHERE id = ?';
  db.query(query, [rideId], (err) => {
    if (err) {
      console.error('Error cancelling ride:', err.message);
      return res.status(500).json({ message: 'Failed to cancel ride' });
    }
    res.json({ message: 'Ride cancelled successfully' });
  });
};
