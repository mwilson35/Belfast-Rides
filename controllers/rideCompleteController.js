// controllers/rideCompleteController.js
const db = require('../db');
const { calculateFare } = require('../utils/fareUtils');
const { getWeekStartAndEnd } = require('../utils/dateUtils');

exports.completeRide = (req, res) => {
  const userId = req.user.id; // Extract user ID from the token
  const userRole = req.user.role; // Extract user role from the token
  const { rideId } = req.body;

  console.log(`Completion request by user: ${userId} (Role: ${userRole}) for Ride ID: ${rideId}`);

  if (userRole !== 'driver') {
    return res.status(403).json({ message: 'Forbidden: Only drivers can complete rides' });
  }

  // Fetch ride details and validate
  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err) {
      console.error('Database error while fetching ride details:', err.message);
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

    // Calculate fare using the centralized function
    const pricing = {
      base_fare: 2.5,
      per_km_rate: 1.2,
      surge_multiplier: ride.surge_multiplier || 1.0,
    };

    const fare = calculateFare(ride.distance || 0, pricing); // Use calculated fare

    // Update the ride's status, fare, and payment status in the database
    db.query(
      'UPDATE rides SET status = ?, fare = ?, payment_status = ? WHERE id = ?',
      ['completed', fare, 'processed', rideId],
      (err) => {
        if (err) {
          console.error('Error updating ride details in rides table:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }

        console.log(`Ride ID: ${rideId} successfully completed by driver: ${userId}, Fare: ${fare}`);

        // Insert earnings into driver_earnings table
        db.query(
          'INSERT INTO driver_earnings (driver_id, ride_id, amount) VALUES (?, ?, ?)',
          [userId, rideId, fare],
          (err) => {
            if (err) {
              console.error('Error updating driver earnings:', err.message);
              return res.status(500).json({ message: 'Error updating driver earnings' });
            }

            console.log(`Earnings updated for Driver ID: ${userId}, Ride ID: ${rideId}, Amount: ${fare}`);

            // Calculate weekly earnings
            const currentDate = new Date();
            const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd(currentDate);
            console.log(`Updating weekly earnings for week start: ${formattedWeekStart} and end: ${formattedWeekEnd}`);

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

                console.log(`Weekly earnings updated for Driver ID: ${userId}`);

                // Emit rideCompleted event via Socket.IO with full ride details
                const io = req.app.get('io'); 
                if (io) {
                  io.emit('rideCompleted', {
                    rideId,
                    driver_id: ride.driver_id,
                    fare, // calculated fare
                    pickup_location: ride.pickup_location,
                    destination: ride.destination,
                    created_at: ride.created_at,
                    distance: ride.distance,
                    estimated_fare: ride.estimated_fare,
                    message: 'Your ride is complete'
                  });
                  console.log('Emitted rideCompleted event with full details');
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
