const db = require('../db');

exports.getActiveRide = (req, res) => {
  const userId = req.user.id; // The authentication middleware should set req.user

  // Query for a ride where the current user (rider) has an active ride.
  // Here we consider "requested", "accepted", "arrived", or "in progress" as active statuses.
  db.query(
    'SELECT * FROM rides WHERE rider_id = ? AND status IN ("requested", "accepted", "arrived", "in progress") LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ message: 'Database error' });
      }
      if (results.length === 0) {
        return res.json(null); // No active ride found
      }
      const ride = results[0];

      // Make sure the ride record includes the necessary coordinates:
      // (Adjust the property names if they differ in your schema)
      if (
        ride.driver_lat && ride.driver_lng &&
        ride.pickup_lat && ride.pickup_lng &&
        ride.destination_lat && ride.destination_lng
      ) {
        // Merge the two segments into one route:
        const routeCoordinates = [
          [ride.driver_lng, ride.driver_lat],         // Driver's current location
          [ride.pickup_lng, ride.pickup_lat],           // Pickup location
          [ride.destination_lng, ride.destination_lat]  // Destination
        ];

        // Build the valid GeoJSON object
        ride.route = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
          properties: {}
        };
      } else {
        console.error("Missing coordinates in ride object.");
      }

      return res.json(ride);
    }
  );
};
