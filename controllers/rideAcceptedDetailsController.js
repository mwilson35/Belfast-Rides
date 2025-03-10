const db = require('../db');

exports.getAcceptedRideDetails = (req, res) => {
  const { rideId } = req.query;
  const riderId = req.user.id;
  
  // Verify that the ride belongs to the rider and is in an active status.
  const rideQuery = `
    SELECT * FROM rides 
    WHERE id = ? AND rider_id = ? AND status IN ('accepted', 'in_progress', 'completed')
  `;
  
  db.query(rideQuery, [rideId, riderId], (err, rides) => {
    if (err) {
      console.error('Database error fetching ride:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (rides.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    const ride = rides[0];
    const driverId = ride.driver_id;
    
    // Retrieve non-sensitive driver details along with vehicle info.
    db.query(
      "SELECT username, vehicle_reg, vehicle_description FROM users WHERE id = ?",
      [driverId],
      (err, driverResults) => {
        if (err) {
          console.error('Error fetching driver details:', err);
          return res.status(500).json({ message: 'Error retrieving driver details' });
        }
        if (driverResults.length === 0) {
          return res.status(404).json({ message: 'Driver not found' });
        }
        
        const driver = driverResults[0];
        
        // Retrieve the driver's average rating from the ratings table.
        db.query(
          "SELECT AVG(rating) AS avgRating, COUNT(*) AS totalRatings FROM ratings WHERE ratee_id = ?",
          [driverId],
          (err, ratingResults) => {
            if (err) {
              console.error('Error fetching ratings:', err);
              return res.status(500).json({ message: 'Error retrieving ratings' });
            }
            // Attach driver info and rating to the ride object.
            ride.driverRating = ratingResults[0];
            ride.driverDetails = driver;
            res.json(ride);
          }
        );
      }
    );
  });
};
