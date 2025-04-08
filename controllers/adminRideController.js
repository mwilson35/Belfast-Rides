const db = require('../db');

// View all rides
exports.getAllRides = (req, res) => {
    const query = `
    SELECT 
      r.id, 
      r.pickup_location, 
      r.destination, 
      r.status, 
      r.driver_id, 
      r.rider_id,
      r.requested_at,
      r.completed_at,
      r.fare,
      r.estimated_fare,
      r.tip,
      r.surge_multiplier,
      r.distance,
      u.username AS driver_name
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
// Assign a driver to a ride
exports.assignDriver = (req, res) => {
  const { rideId, driverId } = req.body;

  if (!rideId || !driverId) {
    return res.status(400).json({ message: 'rideId and driverId are required' });
  }

  const checkStatusQuery = 'SELECT status FROM rides WHERE id = ?';
  db.query(checkStatusQuery, [rideId], (err, results) => {
    if (err) {
      console.error('Error checking ride status:', err.message);
      return res.status(500).json({ message: 'Failed to validate ride status' });
    }

    const ride = results[0];
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ message: `Cannot assign driver to a ride with status "${ride.status}"` });
    }

    const updateQuery = 'UPDATE rides SET driver_id = ?, status = "accepted" WHERE id = ?';
    db.query(updateQuery, [driverId, rideId], (err) => {
      if (err) {
        console.error('Error assigning driver:', err.message);
        return res.status(500).json({ message: 'Failed to assign driver' });
      }
      res.json({ message: 'Driver assigned successfully and ride marked as accepted.' });
    });
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
