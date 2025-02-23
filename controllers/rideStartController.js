const db = require('../db');

exports.startRide = (req, res) => {
  const { rideId } = req.body;
  const driverId = req.user.id;

  if (!rideId) {
    return res.status(400).json({ message: 'rideId is required.' });
  }

  // Fetch the ride to ensure it belongs to the driver and is in "accepted" status.
  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err) {
      console.error('Error fetching ride:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = results[0];
    if (ride.driver_id !== driverId) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this ride' });
    }
    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'Ride must be in accepted status to be started' });
    }

    // Update ride status to "in_progress"
    db.query('UPDATE rides SET status = ? WHERE id = ?', ['in_progress', rideId], (err, updateResults) => {
      if (err) {
        console.error('Error updating ride status:', err);
        return res.status(500).json({ message: 'Database error updating ride status' });
      }
      res.json({ message: 'Ride started successfully', rideId });
    });
  });
};
