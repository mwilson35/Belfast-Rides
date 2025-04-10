
const db = require('../db');


exports.cancelRide = (req, res, io) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { rideId } = req.body;

  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = results[0];

    if (
      (userRole === 'rider' && ride.rider_id !== userId) ||
      (userRole === 'driver' && ride.driver_id !== userId)
    ) {
      return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
    }

    if (ride.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    }

    db.query('UPDATE rides SET status = ? WHERE id = ?', ['cancelled', rideId], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error canceling ride' });
      }

      // 🧠 Socket emit depending on role
// Always emit the generic cancellation event for compatibility
io.emit('rideCancelled', { rideId });

// Optionally emit more specific ones too
if (userRole === 'rider') {
  io.emit('rideCancelledByRider', { rideId });
} else if (userRole === 'driver') {
  io.emit('rideCancelledByDriver', { rideId });
}

      

      // 🧹 Remove from available rides in general
      io.emit('removeRide', rideId);

      res.json({ message: 'Ride canceled successfully' });
    });
  });
};
