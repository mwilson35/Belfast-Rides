const axios = require('axios');

exports.previewRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;
  
  if (!pickupLocation || !destination) {
    return res.status(400).json({ message: 'Pickup and destination locations are required.' });
  }
  
  try {
    console.log(`Previewing ride from ${pickupLocation} to ${destination}`);
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: pickupLocation,
        destinations: destination,
        key: process.env.GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    });
    
    const data = response.data;
    console.log('Google Maps API response:', JSON.stringify(data, null, 2));
    
    const elementStatus = data.rows[0]?.elements[0]?.status;
    if (elementStatus !== 'OK') {
      const errorMessage = data.error_message || `Status from API: ${elementStatus}`;
      return res.status(400).json({ message: errorMessage || 'Unable to calculate distance and duration.' });
    }
    
    const distance = data.rows[0].elements[0].distance.value / 1000;
    const duration = data.rows[0].elements[0].duration.text;
    const baseFare = 2.5;
    const farePerKm = 1.2;
    const estimatedFare = (baseFare + distance * farePerKm).toFixed(2);
    
    res.json({
      pickupLocation,
      destination,
      distance: `${distance.toFixed(2)} km`,
      duration,
      estimatedFare: `£${estimatedFare}`
    });
  } catch (error) {
    console.error('Error during ride preview:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to preview ride.' });
  }
};
