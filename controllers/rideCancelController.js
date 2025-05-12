const db = require('../db');

exports.cancelRide = (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { rideId } = req.body;

  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = results[0];

    if (userRole !== 'admin' && (
      (userRole === 'rider' && ride.rider_id !== userId) ||
      (userRole === 'driver' && ride.driver_id !== userId)
    )) {
      return res.status(403).json({ message: 'Forbidden: You cannot cancel this ride' });
    }

    if (ride.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    }

    db.query('UPDATE rides SET status = ? WHERE id = ?', ['cancelled', rideId], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error canceling ride' });
      }

      const io = req.app.get('io');

      io.to(rideId).emit('rideCancelled', { rideId, cancelledBy: userRole === 'admin' ? 'admin' : userRole });

      if (userRole === 'rider') {
        io.to(rideId).emit('rideCancelledByRider', { rideId });
      } else if (userRole === 'driver') {
        io.to(rideId).emit('rideCancelledByDriver', { rideId });
      }

      io.emit('removeRide', rideId);

      res.json({ message: 'Ride canceled successfully' });
    });
  });
};
