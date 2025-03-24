import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import io from 'socket.io-client';
import AvailableRidesList from '../components/AvailableRidesList';
import DriverMapSection from '../components/DriverMapSection';
import '../styles/DriverDashboard.css';

const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');
  const [rideAccepted, setRideAccepted] = useState(false);
  const [mapZoom, setMapZoom] = useState(12);
  const [driverLocation, setDriverLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);

  useEffect(() => {
    fetchAvailableRides();
  }, []);

  useEffect(() => {
    if (!rideAccepted) return;
    setMapZoom(16);
    const socket = io("http://localhost:5000");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        const location = { lat: latitude, lng: longitude, heading };
        setDriverLocation(location);
        socket.emit("driverLocationUpdate", location);
      },
      (error) => {
        console.error("Error watching location:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
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
        const acceptedRide = availableRides.find(ride => ride.id === rideId);
        if (acceptedRide && acceptedRide.pickupLocation) {
          setRiderLocation(acceptedRide.pickupLocation);
        }
        fetchAvailableRides();
      })
      .catch(error => {
        console.error('Error accepting ride:', error);
        setMessage('Failed to accept ride.');
      });
  };

  const markers = [];
  if (driverLocation) {
    markers.push({
      id: 'driver',
      lat: driverLocation.lat,
      lng: driverLocation.lng,
      heading: driverLocation.heading
    });
  }

  // Compute a simple polyline route between driver and rider.
  const route = (driverLocation && riderLocation) ? [driverLocation, riderLocation] : [];

  return (
    <div className="driver-dashboard">
      <Navbar />
      <div className="dashboard-container" style={{ padding: '1rem' }}>
        <div className="row">
          <div className="col-md-8">
            <DriverMapSection 
              markers={markers} 
              route={route} 
              center={driverLocation} 
              zoom={mapZoom} 
            />
          </div>
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
