const axios = require('axios');

exports.previewRide = async (req, res) => {
  const { pickupLocation, destination } = req.body;

  if (!pickupLocation || !destination) {
    return res.status(400).json({ message: 'Pickup and destination locations are required.' });
  }

  const mapboxToken = process.env.MAPBOX_TOKEN;

  try {
    console.log(`Previewing ride from ${pickupLocation} to ${destination}`);

    // 1. Geocode pickup location
    const pickupGeo = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupLocation)}.json`, {
      params: { access_token: mapboxToken }
    });

    // 2. Geocode destination
    const destinationGeo = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json`, {
      params: { access_token: mapboxToken }
    });

    if (!pickupGeo.data.features.length || !destinationGeo.data.features.length) {
      return res.status(400).json({ message: 'Unable to find location coordinates. Check addresses.' });
    }

    const [pickupLng, pickupLat] = pickupGeo.data.features[0].center;
    const [destLng, destLat] = destinationGeo.data.features[0].center;

    // 3. Get directions from Mapbox
    const directionsResponse = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${destLng},${destLat}`, {
      params: {
        access_token: mapboxToken,
        geometries: 'geojson'
      }
    });

    const directionsData = directionsResponse.data;

    if (!directionsData.routes || !directionsData.routes.length) {
      return res.status(400).json({ message: 'No valid route found with Mapbox.' });
    }

    const route = directionsData.routes[0];
    const distanceInMeters = route.distance;
    const durationInSeconds = route.duration;
    const distanceInKm = distanceInMeters / 1000;

    const baseFare = 2.5;
    const farePerKm = 1.2;
    const estimatedFare = baseFare + distanceInKm * farePerKm;

    // Format route as GeoJSON FeatureCollection
    const geojsonRoute = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: route.geometry,
          properties: {}
        }
      ]
    };

    res.status(200).json({
      pickupLocation,
      destination,
      distance: `${distanceInKm.toFixed(2)} km`,
      duration: `${Math.round(durationInSeconds / 60)} mins`,
      estimatedFare: `£${estimatedFare.toFixed(2)}`,
      encodedPolyline: geojsonRoute,
      pickupLat,
      pickupLng,
      destinationLat: destLat,
      destinationLng: destLng
    });
  } catch (error) {
    console.error('Error during Mapbox preview:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to preview ride with Mapbox.' });
  }
};
