// src/pages/DriverDashboard.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';



const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAvailableRides();
  }, []);

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
