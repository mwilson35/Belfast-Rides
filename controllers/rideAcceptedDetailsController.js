const db = require('../db');

exports.getAcceptedRideDetails = (req, res) => {
  const { rideId } = req.query;
  const riderId = req.user.id;
  
  // Verify that the ride belongs to the rider and is accepted, in progress, or completed.
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
    
    // Retrieve the driver's average rating.
    db.query(
      "SELECT AVG(rating) AS avgRating, COUNT(*) AS totalRatings FROM ratings WHERE ratee_id = ?",
      [driverId],
      (err, ratingResults) => {
        if (err) {
          console.error('Error fetching ratings:', err);
          return res.status(500).json({ message: 'Error retrieving ratings' });
        }
        ride.driverRating = ratingResults[0]; // Attach rating info to the ride details.
        res.json(ride);
      }
    );
  });
};
