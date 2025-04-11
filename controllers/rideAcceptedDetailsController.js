const db = require('../db');

exports.getAcceptedRideDetails = (req, res) => {
  const { rideId } = req.query;
  const user = req.user; // Contains id and role

  // Build base query.
  let rideQuery = `
    SELECT id, pickup_location, destination, pickup_lat, pickup_lng, destination_lat, destination_lng, 
           driver_id, rider_id, status, decoded_route, estimated_fare
    FROM rides 
    WHERE id = ? `;

  const params = [rideId];

  // Filter by rider_id if user is a rider; by driver_id if user is a driver.
  if (user.role === 'rider') {
    rideQuery += `AND rider_id = ? AND status IN ('accepted', 'in_progress', 'completed')`;
    params.push(user.id);
  } else if (user.role === 'driver') {
    rideQuery += `AND driver_id = ? AND status IN ('accepted', 'in_progress', 'completed')`;
    params.push(user.id);
  }

  db.query(rideQuery, params, (err, rides) => {
    if (err) {
      console.error('Database error fetching ride:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (rides.length === 0) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const ride = rides[0];
    const driverId = ride.driver_id;

    // Get driver details for display.
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

        // Get driver ratings.
        db.query(
          "SELECT AVG(rating) AS avgRating, COUNT(*) AS totalRatings FROM ratings WHERE ratee_id = ?",
          [driverId],
          (err, ratingResults) => {
            if (err) {
              console.error('Error fetching ratings:', err);
              return res.status(500).json({ message: 'Error retrieving ratings' });
            }
            ride.driverRating = ratingResults[0];
            ride.driverDetails = driver;

            // Rename keys for consistency.
            const renameKeys = (obj, keyMap) =>
              Object.keys(keyMap).reduce((acc, key) => {
                acc[keyMap[key]] = obj[key];
                return acc;
              }, {});
              if (ride.decoded_route && typeof ride.decoded_route === 'string') {
                try {
                  ride.decoded_route = JSON.parse(ride.decoded_route);
                } catch (e) {
                  console.error("Error parsing decoded_route", e);
                }
              }
              
            Object.assign(ride, renameKeys(ride, {
              destination_lat: 'destinationLat',
              destination_lng: 'destinationLng',
              pickup_lat: 'pickupLat',
              pickup_lng: 'pickupLng'
            }));

            console.log('Final ride object sent to frontend:', ride);
            res.json(ride);
          }
        );
      }
    );
  });
};
