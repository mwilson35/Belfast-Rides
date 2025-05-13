const axios = require('axios');

exports.previewRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;

  if (!pickupLocation || !destination) {
    return res.status(400).json({ message: 'Pickup and destination addresses are required.' });
  }

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // Explicitly geocode addresses first
    const geocodeAddress = async (address) => {
      const geocodeRes = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: { address, key: googleApiKey }
      });

      if (geocodeRes.data.status !== 'OK') {
        throw new Error(`Geocoding failed for ${address}`);
      }

      return geocodeRes.data.results[0].geometry.location;
    };

    const pickupCoords = await geocodeAddress(pickupLocation);
    const destinationCoords = await geocodeAddress(destination);

    const directionsResponse = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
      params: {
        origin: `${pickupCoords.lat},${pickupCoords.lng}`,
        destination: `${destinationCoords.lat},${destinationCoords.lng}`,
        mode: 'driving',
        key: googleApiKey
      }
    });

    const directions = directionsResponse.data;

    if (!directions.routes || !directions.routes.length) {
      return res.status(400).json({ message: 'No valid route found with Google.' });
    }

    const route = directions.routes[0];
    const distanceInMeters = route.legs[0].distance.value;
    const durationInSeconds = route.legs[0].duration.value;
    const distanceInKm = distanceInMeters / 1000;

    const baseFare = 2.5;
    const farePerKm = 1.2;
    const estimatedFare = baseFare + distanceInKm * farePerKm;

    const encodedPolyline = route.overview_polyline.points;

    res.status(200).json({
      pickupLocation,
      destination,
      distance: `${distanceInKm.toFixed(2)} km`,
      duration: `${Math.round(durationInSeconds / 60)} mins`,
      estimatedFare: `£${estimatedFare.toFixed(2)}`,
      encodedPolyline,
      pickupLat: pickupCoords.lat,
      pickupLng: pickupCoords.lng,
      destinationLat: destinationCoords.lat,
      destinationLng: destinationCoords.lng
    });
  } catch (error) {
    console.error('Google API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to preview ride with Google.', 
      error: error.response?.data || error.message 
    });
  }
};
