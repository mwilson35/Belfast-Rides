const axios = require('axios');

exports.previewRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;
  
  if (!pickupLocation || !destination) {
    return res.status(400).json({ message: 'Pickup and destination locations are required.' });
  }
  
  try {
    console.log(`Previewing ride from ${pickupLocation} to ${destination}`);

    // 1. Call the Distance Matrix API to calculate distance, duration, and estimated fare.
    const distanceResponse = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: pickupLocation,
        destinations: destination,
        key: process.env.GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    });
    
    const distanceData = distanceResponse.data;
    console.log('Distance Matrix API response:', JSON.stringify(distanceData, null, 2));
    
    const elementStatus = distanceData.rows[0]?.elements[0]?.status;
    if (elementStatus !== 'OK') {
      const errorMessage = distanceData.error_message || `Status from API: ${elementStatus}`;
      return res.status(400).json({ message: errorMessage || 'Unable to calculate distance and duration.' });
    }
    
    const distance = distanceData.rows[0].elements[0].distance.value / 1000;
    const duration = distanceData.rows[0].elements[0].duration.text;
    const baseFare = 2.5;
    const farePerKm = 1.2;
    const estimatedFare = (baseFare + distance * farePerKm).toFixed(2);

    // 2. Call the Directions API to get the route details (extracting the encoded polyline).
    const directionsResponse = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: pickupLocation,
        destination: destination,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });
    
    let encodedPolyline = null;
    if (directionsResponse.data.routes && directionsResponse.data.routes.length > 0) {
      const route = directionsResponse.data.routes[0];
      encodedPolyline = route.overview_polyline.points;
    }
    
    // 3. Return all preview data including the polyline.
    res.json({
      pickupLocation,
      destination,
      distance: `${distance.toFixed(2)} km`,
      duration,
      estimatedFare: `£${estimatedFare}`,
      encodedPolyline
    });
  } catch (error) {
    console.error('Error during ride preview:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to preview ride.' });
  }
};
