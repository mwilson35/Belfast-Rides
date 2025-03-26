import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import io from 'socket.io-client';
import AvailableRidesList from '../components/AvailableRidesList';
import DriverInteractiveMap from '../components/DriverInteractiveMap';
import '../styles/DriverDashboard.css';

// Helper: Calculate distance (in meters) between two lat/lng points using the Haversine formula.
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const geocodeAddress = address =>
  new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        resolve({ lat: lat(), lng: lng() });
      } else {
        reject(`Geocode failed: ${status}`);
      }
    });
  });

const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directions, setDirections] = useState(null);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [arrivedPingSent, setArrivedPingSent] = useState(false);

  const fetchAvailableRides = () => {
    api.get('/rides/available')
      .then(res => setAvailableRides(res.data))
      .catch(err => console.error('Error fetching available rides:', err));
  };

  useEffect(() => {
    fetchAvailableRides();
  }, []);

  // Socket and geolocation watcher: update driver location and check for arrival.
  useEffect(() => {
    const socket = io('http://localhost:5000');
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(loc);
        socket.emit('driverLocationUpdate', loc);
  
        // If there's a pickup location and an accepted ride, check the distance.
        if (riderLocation && acceptedRide && !arrivedPingSent) {
          const distance = getDistanceFromLatLonInMeters(
            loc.lat,
            loc.lng,
            riderLocation.lat,
            riderLocation.lng
          );
          console.log('Distance to pickup:', distance); // Debug log
          if (distance < 55) {
            socket.emit('driverArrived', { rideId: acceptedRide.id, location: loc });
            setMessage('Driver has arrived at pickup location.');
            setArrivedPingSent(true);
          }
          
        }
      },
      err => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [riderLocation, acceptedRide, arrivedPingSent]);
  

  const handleAcceptRide = async rideId => {
    try {
      await api.post('/rides/accept', { rideId });
      setMessage(`Ride ${rideId} accepted!`);
      const ride = availableRides.find(r => r.id === rideId);
      setAcceptedRide(ride);
      // Reset arrival flag for new ride.
      setArrivedPingSent(false);
      if (ride?.pickup_location) {
        setRiderLocation(await geocodeAddress(ride.pickup_location));
      }
      if (ride?.destination) {
        setDestination(await geocodeAddress(ride.destination));
      }
      fetchAvailableRides();
    } catch (err) {
      console.error('Error accepting ride:', err);
      setMessage('Failed to accept ride.');
    }
  };

  const handleStartRide = async () => {
    if (!acceptedRide) return;
    try {
      const response = await api.post('/rides/start', { rideId: acceptedRide.id });
      setMessage(response.data.message || 'Ride started successfully');
      // Clear the pickup marker so that the route recalculates to the destination.
      setRiderLocation(null);
    } catch (error) {
      console.error('Error starting ride:', error);
      setMessage('Failed to start ride.');
    }
  };

  // Use client-side DirectionsService for real-time route updates.
  useEffect(() => {
    let intervalId;
    const fetchClientSideDirections = () => {
      if (driverLocation && (riderLocation || destination)) {
        const directionsService = new window.google.maps.DirectionsService();
        const origin = new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng);
        // Route to pickup if it exists; otherwise, route to destination.
        const target = riderLocation
          ? new window.google.maps.LatLng(riderLocation.lat, riderLocation.lng)
          : new window.google.maps.LatLng(destination.lat, destination.lng);
        directionsService.route(
          {
            origin: origin,
            destination: target,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK || status === 'OK') {
              setDirections(result);
            } else {
              console.error('Error fetching directions:', result);
            }
          }
        );
      }
    };

    fetchClientSideDirections();
    intervalId = setInterval(fetchClientSideDirections, 30000); // update every 30 seconds

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [driverLocation, riderLocation, destination]);

  const markers = [];
  if (driverLocation) markers.push({ id: 'driver', ...driverLocation, label: 'D' });
  if (riderLocation) markers.push({ id: 'pickup', ...riderLocation, label: 'P' });
  if (destination) markers.push({ id: 'dropoff', ...destination, label: 'X' });

  return (
    <div className="driver-dashboard">
      <Navbar />
      <div className="driver-dashboard-content">
        <div className="map-section">
          <DriverInteractiveMap
            markers={markers}
            center={driverLocation}
            zoom={16}
            autoFit={true}
            directions={directions}
          />
        </div>
        <div className="ride-requests-panel">
          <h2>Available Rides</h2>
          {message && <div className="alert alert-info">{message}</div>}
          { !acceptedRide ? (
            <AvailableRidesList
              rides={availableRides}
              onAcceptRide={handleAcceptRide}
            />
          ) : (
            <div>
              <p>Ride {acceptedRide.id} accepted. Ready to start?</p>
              <button onClick={handleStartRide}>Start Ride</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
