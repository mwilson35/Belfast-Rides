// src/pages/DriverDashboard.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import io from 'socket.io-client';

const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');
  const [rideAccepted, setRideAccepted] = useState(false);

  // Fetch available rides when the component mounts
  useEffect(() => {
    fetchAvailableRides();
  }, []);

  // Start sending live location updates only after a ride is accepted
  useEffect(() => {
    if (!rideAccepted) return; // Do nothing if no ride accepted

    const socket = io("http://localhost:5000");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Emit the driver's current location to the server
        socket.emit("driverLocationUpdate", { lat: latitude, lng: longitude });
        console.log(`Location updated: ${latitude}, ${longitude}`);
      },
      (error) => {
        console.error("Error watching location:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Cleanup: stop watching location and disconnect socket on unmount or when rideAccepted becomes false
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [rideAccepted]);

  const fetchAvailableRides = () => {
    api.get('/rides/available')
      .then(response => {
        setAvailableRides(response.data);
      })
      .catch(error => {
        console.error('Error fetching available rides:', error);
      });
  };

  const handleAcceptRide = (rideId) => {
    api.post('/rides/accept', { rideId })
      .then(response => {
        setMessage(`Ride ${rideId} accepted successfully!`);
        // Set the flag to start sending location updates
        setRideAccepted(true);
        // Optionally, refresh the available rides list
        fetchAvailableRides();
      })
      .catch(error => {
        console.error('Error accepting ride:', error);
        setMessage('Failed to accept ride.');
      });
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: '1rem' }}>
        <h1>Driver Dashboard</h1>
        {message && <p>{message}</p>}
        <h2>Available Rides</h2>
        {availableRides && availableRides.length ? (
          <ul>
            {availableRides.map((ride) => (
              <li key={ride.id}>
                {ride.pickup_location} to {ride.destination} - Status: {ride.status}
                <button onClick={() => handleAcceptRide(ride.id)}>Accept Ride</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No available rides at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
