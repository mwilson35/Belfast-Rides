
const db = require('../db');


exports.acceptRide = async (req, res) => {
  console.log('Accept endpoint hit');

  const { rideId } = req.body;
  const driverId = req.user.id;

  if (!rideId) {
    console.log('Missing rideId in request body:', req.body);
    return res.status(400).json({ message: 'rideId is required' });
  }

  console.log(`Attempting to accept ride with ID: ${rideId} by driver: ${driverId}`);

  try {
    db.query(
      'UPDATE rides SET status = "accepted", driver_id = ? WHERE id = ? AND status = "requested"',
      [driverId, rideId],
      (err, results) => {
        if (err) {
          console.error('Database error while accepting ride:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }

        if (results.affectedRows === 0) {
          console.log(`Ride not found or already accepted: ID ${rideId}`);
          return res.status(404).json({ message: 'Ride not found or already accepted.' });
        }

        // Emit to sockets
        const io = req.app.get('io');
        io.emit('driverAccepted', {
          rideId,
          driverId,
          message: 'Driver accepted the ride.',
        });

        io.emit('removeRide', rideId); // 🧹 Tell all other drivers to ditch it

        return res.json({
          message: 'Ride accepted successfully.',
          rideId,
        });
      }
    );
  } catch (error) {
    console.error('Unexpected error in acceptRide controller:', error.message);
    return res.status(500).json({ message: 'Unexpected server error.' });
  }
};
