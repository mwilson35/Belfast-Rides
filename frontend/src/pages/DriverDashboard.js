// src/pages/DriverDashboard.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';

const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);

  useEffect(() => {
    // Fetch available rides from the backend
    api.get('/rides/available')
      .then((response) => {
        setAvailableRides(response.data);
      })
      .catch((error) => {
        console.error('Error fetching available rides:', error);
      });
  }, []);

  return (
    <div>
      <h1>Driver Dashboard</h1>
      <h2>Available Rides:</h2>
      <ul>
        {availableRides.map((ride) => (
          <li key={ride.id}>
            {ride.pickup_location} to {ride.destination} - {ride.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DriverDashboard;
