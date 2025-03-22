import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import io from 'socket.io-client';
import AvailableRidesList from '../components/AvailableRidesList';
import MapSection from '../components/MapSection';
import '../styles/DriverDashboard.css';

const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');
  const [rideAccepted, setRideAccepted] = useState(false);
  const [mapZoom, setMapZoom] = useState(12); // Default zoom level

  // Fetch available rides when the component mounts
  useEffect(() => {
    fetchAvailableRides();
  }, []);

  // When a ride is accepted, update the map zoom and start sending live location updates
  useEffect(() => {
    if (!rideAccepted) return;

    // Zoom in when a ride is accepted
    setMapZoom(16);

    const socket = io("http://localhost:5000");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Optionally, you can also send location updates with the new zoom level in your map component if needed.
        socket.emit("driverLocationUpdate", { lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Error watching location:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Cleanup on unmount or when rideAccepted becomes false
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [rideAccepted]);

  const fetchAvailableRides = () => {
    api.get('/rides/available')
      .then(response => setAvailableRides(response.data))
      .catch(error => console.error('Error fetching available rides:', error));
  };

  const handleAcceptRide = (rideId) => {
    api.post('/rides/accept', { rideId })
      .then(response => {
        setMessage(`Ride ${rideId} accepted successfully!`);
        setRideAccepted(true);
        setMapZoom(16); // Zoom in on the map when ride is accepted
        // Optionally, refresh the available rides list
        fetchAvailableRides();
      })
      .catch(error => {
        console.error('Error accepting ride:', error);
        setMessage('Failed to accept ride.');
      });
  };

  return (
    <div className="driver-dashboard">
      <Navbar />
      <div className="driver-dashboard-content">
        {/* The map takes up most of the screen */}
        <MapSection zoom={mapZoom} />
        {/* Side panel for ride requests */}
        <div className="ride-requests-panel">
          <h2>Available Rides</h2>
          {message && <div className="alert alert-info">{message}</div>}
          <AvailableRidesList rides={availableRides} onAcceptRide={handleAcceptRide} />
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
