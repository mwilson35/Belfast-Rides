const db = require('../db');
const { calculateFare } = require('../utils/fareUtils');
const { getWeekStartAndEnd } = require('../utils/dateUtils');

exports.completeRide = (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { rideId } = req.body;

  console.log(`Completion request by user: ${userId} (Role: ${userRole}) for Ride ID: ${rideId}`);

  if (userRole !== 'driver') {
    return res.status(403).json({ message: 'Forbidden: Only drivers can complete rides' });
  }

  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = results[0];

    if (ride.driver_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: You cannot complete this ride' });
    }
    if (ride.status === 'completed') {
      return res.status(400).json({ message: 'Ride is already completed' });
    }
    if (!['accepted', 'in_progress'].includes(ride.status)) {
      return res.status(400).json({ message: 'Cannot complete a ride that is not in progress or accepted' });
    }

    const pricing = {
      base_fare: 2.5,
      per_km_rate: 1.2,
      surge_multiplier: ride.surge_multiplier || 1.0,
    };

    const fare = calculateFare(ride.distance || 0, pricing);

    db.query(
      'UPDATE rides SET status = ?, fare = ?, payment_status = ? WHERE id = ?',
      ['completed', fare, 'processed', rideId],
      (err) => {
        if (err) {
          console.error('Error updating ride:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }

        db.query(
          'INSERT INTO driver_earnings (driver_id, ride_id, amount) VALUES (?, ?, ?)',
          [userId, rideId, fare],
          (err) => {
            if (err) {
              console.error('Error updating earnings:', err.message);
              return res.status(500).json({ message: 'Error updating driver earnings' });
            }

            const currentDate = new Date();
            const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd(currentDate);

            db.query(
              `INSERT INTO weekly_earnings (driver_id, week_start, week_end, total_earnings)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE total_earnings = total_earnings + ?`,
              [userId, formattedWeekStart, formattedWeekEnd, fare, fare],
              (err) => {
                if (err) {
                  console.error('Error updating weekly earnings:', err.message);
                  return res.status(500).json({ message: 'Error updating weekly earnings' });
                }

                const io = req.app.get('io');
                if (io) {
                  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, [updatedRide]) => {
                    if (err || !updatedRide) {
                      console.error('Error re-fetching ride:', err);
                      return;
                    }

                    io.to(rideId).emit('rideCompleted', {
                      rideId: updatedRide.id,
                      driver_id: updatedRide.driver_id,
                      fare: updatedRide.fare,
                      pickup_location: updatedRide.pickup_location,
                      destination: updatedRide.destination,
                      created_at: updatedRide.created_at,
                      distance: updatedRide.distance,
                      estimated_fare: updatedRide.estimated_fare,
                      message: 'Your ride is complete'
                    });

                    console.log('Emitted targeted rideCompleted event.');
                  });
                } else {
                  console.error('Socket.IO instance not found');
                }

                return res.json({ message: 'Ride completed successfully', fare });
              }
            );
          }
        );
      }
    );
  });
};
