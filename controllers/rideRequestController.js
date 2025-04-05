const axios = require('axios');
const db = require('../db');
console.log('MAPBOX_TOKEN in backend:', process.env.MAPBOX_TOKEN);


exports.requestRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;
  const riderId = req.user.id;
  const userRole = req.user.role;

  if (userRole !== 'rider') {
    return res.status(403).json({ message: 'Forbidden: Only riders can request rides' });
  }

  const mapboxToken = process.env.MAPBOX_TOKEN; 


  try {
    // First geocode pickupLocation
    const pickupGeo = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupLocation)}.json`, {
      params: { access_token: mapboxToken }
    });

    // Then geocode destination
    const destinationGeo = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json`, {
      params: { access_token: mapboxToken }
    });

    if (!pickupGeo.data.features.length || !destinationGeo.data.features.length) {
      return res.status(400).json({ message: 'Unable to find location coordinates. Check addresses.' });
    }

    const [pickupLng, pickupLat] = pickupGeo.data.features[0].center;
    const [destLng, destLat] = destinationGeo.data.features[0].center;

    // Now call Mapbox Directions API using coordinates
    const directionsResponse = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${destLng},${destLat}`, {
      params: { access_token: mapboxToken, geometries: 'geojson' }
    });

    const directionsData = directionsResponse.data;

    if (!directionsData.routes || !directionsData.routes.length) {
      return res.status(400).json({ message: 'Unable to calculate route. Check locations.' });
    }

    const route = directionsData.routes[0];
    const distanceInMeters = route.distance;
    const durationInSeconds = route.duration;
    const distanceInKm = distanceInMeters / 1000;
    const baseFare = 2.5;
    const farePerKm = 1.2;
    const estimatedFare = baseFare + distanceInKm * farePerKm;

    // Insert ride into the database clearly
    db.query(
      `INSERT INTO rides 
        (pickup_location, destination, rider_id, distance, estimated_fare, status, payment_status, encoded_polyline, pickup_lat, pickup_lng, destination_lat, destination_lng) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pickupLocation,
        destination,
        riderId,
        distanceInKm,
        estimatedFare,
        'requested',
        'pending',
        JSON.stringify(route.geometry),
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

        res.status(201).json({
          message: 'Ride requested successfully',
          rideId: results.insertId,
          distance: `${distanceInKm.toFixed(2)} km`,
          duration: `${Math.round(durationInSeconds / 60)} mins`,
          estimatedFare: `£${estimatedFare.toFixed(2)}`,
          encodedPolyline: route.geometry
        });
      }
    );

  } catch (error) {
    console.error('Full error stack:', error); // ← this is what you need
    res.status(500).json({ message: 'Error calculating ride route.' });
  }
  
};
