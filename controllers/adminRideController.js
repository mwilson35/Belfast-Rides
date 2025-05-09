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
  
        const io = req.app.get('io');
        const driverSockets = req.app.get('driverSockets');
  
        // Convert driverId to string for lookup
        const socketId = driverSockets.get(String(driverId));
        console.log(`Looking for socket of driver ${driverId}, found: ${socketId}`);
  
        if (socketId) {
          // Also send the driverId as a string
          io.to(socketId).emit('driverAccepted', { rideId, driverId: String(driverId) });
          console.log(`Sent driverAccepted to socket ${socketId} for driver ${driverId}`);
        } else {
          console.warn(`No socket for driver ${driverId}`);
        }
  
        res.json({ message: 'Driver assigned successfully and ride marked as accepted.' });
      });
    });
  };
  
  
  



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
    // Get the socket instance from the Express app:
    const io = req.app.get('io');
    
    // Emit the rideCancelled event with a payload indicating admin cancellation:
    io.emit('rideCancelled', { rideId, cancelledBy: 'admin' });
    // Also emit removeRide so it clears in the driver dashboard:
    io.emit('removeRide', rideId);
    
    res.json({ message: 'Ride cancelled successfully' });
  });
};
