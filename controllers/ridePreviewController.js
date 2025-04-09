const axios = require('axios');

exports.previewRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;

  if (!pickupLocation || !destination) {
    return res.status(400).json({ message: 'Pickup and destination locations are required.' });
  }

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    console.log(`Previewing ride from ${pickupLocation} to ${destination}`);

    const directionsResponse = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
      params: {
        origin: pickupLocation,
        destination: destination,
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

    const pickupLat = route.legs[0].start_location.lat;
    const pickupLng = route.legs[0].start_location.lng;
    const destinationLat = route.legs[0].end_location.lat;
    const destinationLng = route.legs[0].end_location.lng;

    res.status(200).json({
      pickupLocation,
      destination,
      distance: `${distanceInKm.toFixed(2)} km`,
      duration: `${Math.round(durationInSeconds / 60)} mins`,
      estimatedFare: `£${estimatedFare.toFixed(2)}`,
      encodedPolyline,
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng
    });
  } catch (error) {
    console.error('Error during Google preview:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to preview ride with Google.' });
  }
};
