const axios = require('axios');
const polyline = require('@mapbox/polyline'); // Decodes Google's encoded polyline
const db = require('../db');

exports.requestRide = async (req, res, io) => {
  const { pickupLocation, destination } = req.body;
  const riderId = req.user.id;
  const userRole = req.user.role;

  // Only allow riders to request rides.
  if (userRole !== 'rider') {
    return res.status(403).json({ message: 'Forbidden: Only riders can request rides' });
  }

  try {
    //Google Geocoding for Pickup 
    const pickupGeoResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      { params: { address: pickupLocation, key: process.env.GOOGLE_MAPS_API_KEY } }
    );
    if (!pickupGeoResponse.data.results.length) {
      return res.status(400).json({ message: 'Unable to find pickup location.' });
    }
    const { lat: pickupLat, lng: pickupLng } = pickupGeoResponse.data.results[0].geometry.location;

    // Google Geocoding for Destination 
    const destinationGeoResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      { params: { address: destination, key: process.env.GOOGLE_MAPS_API_KEY } }
    );
    if (!destinationGeoResponse.data.results.length) {
      return res.status(400).json({ message: 'Unable to find destination location.' });
    }
    const { lat: destLat, lng: destLng } = destinationGeoResponse.data.results[0].geometry.location;

    //  Google Directions API for Routing 
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupLat},${pickupLng}&destination=${destLat},${destLng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const directionsResponse = await axios.get(directionsUrl);
    const directionsData = directionsResponse.data;
    if (!directionsData.routes || !directionsData.routes.length) {
      return res.status(400).json({ message: 'Unable to calculate route. Check locations.' });
    }
    const googleRoute = directionsData.routes[0];
    const decodedPolyline = polyline.decode(googleRoute.overview_polyline.points);

    // Two formats:
    // 1. decodedRoute: Array of objects { lat, lng } for internal use.
    const decodedRoute = decodedPolyline.map(([lat, lng]) => ({ lat, lng }));
    // 2. geojsonRoute: GeoJSON FeatureCollection for Mapbox display.
    const geojsonRoute = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: decodedPolyline.map(([lat, lng]) => [lng, lat]),
          },
          properties: {}
        }
      ]
    };

    //  Fare Calculation 
    const distanceInMeters = googleRoute.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const durationInSeconds = googleRoute.legs.reduce((sum, leg) => sum + leg.duration.value, 0);
    const distanceInKm = distanceInMeters / 1000;
    const baseFare = 2.5;
    const farePerKm = 1.2;
    const estimatedFare = baseFare + distanceInKm * farePerKm;

    //  Check for Active Ride 
    db.query(
      "SELECT * FROM rides WHERE rider_id = ? AND status IN ('requested', 'accepted')",
      [riderId],
      (err, activeRides) => {
        if (err) {
          console.error("DB error checking active rides:", err.message);
          return res.status(500).json({ message: 'Database error' });
        }
        if (activeRides.length > 0) {
          return res.status(400).json({ message: 'You already have an active ride.' });
        }

        // Insert New Ride into the Database 
        db.query(
          `INSERT INTO rides 
            (pickup_location, destination, rider_id, distance, estimated_fare, status, payment_status, encoded_polyline, decoded_route, pickup_lat, pickup_lng, destination_lat, destination_lng) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pickupLocation,
            destination,
            riderId,
            distanceInKm,
            estimatedFare,
            'requested',
            'pending',
            JSON.stringify(geojsonRoute),    
            JSON.stringify(decodedRoute),      
            pickupLat,
            pickupLng,
            destLat,
            destLng
          ],
          (err, results) => {
            if (err) {
              console.error('Database error:', err.message);
              return res.status(500).json({ message: 'Database error' });
            }

            const ride = {
              id: results.insertId,
              pickup_location: pickupLocation,
              destination,
              rider_id: riderId,
              distance: distanceInKm,
              estimated_fare: estimatedFare,
              status: 'requested',
              pickup_lat: pickupLat,
              pickup_lng: pickupLng,
              destination_lat: destLat,
              destination_lng: destLng,
              encoded_polyline: geojsonRoute
            };

            // Emit New Ride to Drivers 
            io.emit('newAvailableRide', ride);

            res.status(201).json({
              message: 'Ride requested successfully',
              rideId: ride.id,
              distance: `${distanceInKm.toFixed(2)} km`,
              duration: `${Math.round(durationInSeconds / 60)} mins`,
              estimatedFare: `£${estimatedFare.toFixed(2)}`,
              geojsonRoute,
              pickupLat,
              pickupLng,
              destinationLat: destLat,
              destinationLng: destLng
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Full error stack:', error);
    res.status(500).json({ message: 'Error calculating ride route.' });
  }
};
