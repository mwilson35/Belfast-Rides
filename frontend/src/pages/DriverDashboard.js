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
  const [driverLocation, setDriverLocation] = useState(null);

  // Fetch available rides when the component mounts
  useEffect(() => {
    fetchAvailableRides();
  }, []);

  // Start live tracking with first-person view when a ride is accepted
  useEffect(() => {
    if (!rideAccepted) return;

    // Zoom in for a closer, first-person view
    setMapZoom(16);

    const socket = io("http://localhost:5000");

    // Mobile geolocation with heading support
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude, heading });
        socket.emit("driverLocationUpdate", { lat: latitude, lng: longitude, heading });
      },
      (error) => {
        console.error("Error watching location:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Cleanup on unmount or when ride is no longer accepted
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
        setMapZoom(16);
        fetchAvailableRides(); // Optionally refresh the available rides list
      })
      .catch(error => {
        console.error('Error accepting ride:', error);
        setMessage('Failed to accept ride.');
      });
  };

  // Prepare markers for the MapSection, including driver location with heading
  const markers = [];
  if (driverLocation) {
    markers.push({ id: 'driver', lat: driverLocation.lat, lng: driverLocation.lng, heading: driverLocation.heading });
  }

  return (
    <div className="driver-dashboard">
      <Navbar />
      <div className="dashboard-container" style={{ padding: '1rem' }}>
        <div className="row">
          {/* Map section: uses your preferred grid layout */}
          <div className="col-md-8">
            <MapSection driverLocation={driverLocation} markers={markers} zoom={mapZoom} />
          </div>
          {/* Side panel for available rides */}
          <div className="col-md-4">
            <h2>Available Rides</h2>
            {message && <div className="alert alert-info">{message}</div>}
            <AvailableRidesList rides={availableRides} onAcceptRide={handleAcceptRide} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
