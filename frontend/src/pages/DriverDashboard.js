import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import io from 'socket.io-client';
import AvailableRidesList from '../components/AvailableRidesList';
import DriverInteractiveMap from '../components/DriverInteractiveMap';
import '../styles/DriverDashboard.css';

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

  const fetchAvailableRides = () => {
    api.get('/rides/available')
      .then(res => setAvailableRides(res.data))
      .catch(err => console.error('Error fetching available rides:', err));
  };

  useEffect(fetchAvailableRides, []);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(loc);
        socket.emit('driverLocationUpdate', loc);
      },
      err => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, []);

  const handleAcceptRide = async rideId => {
    try {
      await api.post('/rides/accept', { rideId });
      setMessage(`Ride ${rideId} accepted!`);

      const ride = availableRides.find(r => r.id === rideId);
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
          />
        </div>
        <div className="ride-requests-panel">
          <h2>Available Rides</h2>
          {message && <div className="alert alert-info">{message}</div>}
          <AvailableRidesList
            rides={availableRides}
            onAcceptRide={handleAcceptRide}
          />
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
