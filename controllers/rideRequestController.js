const axios = require('axios');
const db = require('../db');

exports.requestRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;
  const riderId = req.user.id;
  const userRole = req.user.role;

  if (userRole !== 'rider') {
    return res.status(403).json({ message: 'Forbidden: Only riders can request rides' });
  }

  console.log(`Requesting ride from ${pickupLocation} to ${destination} by Rider ID: ${riderId}`);

  // Check if the rider already has a ride in progress
  const checkQuery = 'SELECT id FROM rides WHERE rider_id = ? AND status IN (?, ?, ?)';
  const statuses = ['requested', 'accepted', 'in_progress'];
  
  db.query(checkQuery, [riderId, ...statuses], (err, results) => {
    if (err) {
      console.error('Error checking existing rides:', err.message);
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length > 0) {
      return res.status(400).json({ message: 'Unable to request new ride' });
    }
    
    // Call Google Distance Matrix API
    axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: pickupLocation,
        destinations: destination,
        key: process.env.GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    })
    .then((response) => {
      const data = response.data;
      console.log('Google Distance Matrix API response:', JSON.stringify(data, null, 2));
      
      if (data.status !== 'OK') {
        console.error('Distance Matrix API returned error status:', data.status);
        return res.status(400).json({ message: 'Unable to calculate distance. Please check locations.' });
      }
      if (!data.rows || !data.rows[0] || !data.rows[0].elements || !data.rows[0].elements[0]) {
        console.error('Unexpected API response structure:', data);
        return res.status(400).json({ message: 'Unexpected API response structure.' });
      }
      const elementStatus = data.rows[0].elements[0].status;
      if (elementStatus !== 'OK') {
        console.error('API element status not OK:', elementStatus);
        const errorMessage = data.error_message || 'Unable to calculate distance. Please check locations.';
        return res.status(400).json({ message: errorMessage });
      }
      
      const distanceInMeters = data.rows[0].elements[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;
      const baseFare = 2.5;
      const farePerKm = 1.2;
      const estimatedFare = baseFare + distanceInKm * farePerKm;
      
      console.log(`Calculated distance: ${distanceInKm.toFixed(2)} km, Estimated Fare: £${estimatedFare.toFixed(2)}`);
      
      // Insert the ride into the database
      db.query(
        'INSERT INTO rides (pickup_location, destination, rider_id, distance, estimated_fare, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pickupLocation, destination, riderId, distanceInKm, estimatedFare, 'requested', 'pending'],
        (err, results) => {
          if (err) {
            console.error('Database error while requesting ride:', err.message);
            return res.status(500).json({ message: 'Database error' });
          }
          console.log('Ride successfully requested with ID:', results.insertId);
          res.status(201).json({
            message: 'Ride requested successfully',
            rideId: results.insertId,
            distance: `${distanceInKm.toFixed(2)} km`,
            estimatedFare: `£${estimatedFare.toFixed(2)}`
          });
        }
      );
    })
    .catch((error) => {
      console.error('Error calling Distance Matrix API:', error.response ? error.response.data : error.message);
      res.status(500).json({ message: 'Error calculating distance.' });
    });
  });
};
