// src/pages/RiderDashboard.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';

const RiderDashboard = () => {
  const [rideHistory, setRideHistory] = useState([]);

  useEffect(() => {
    // Fetch the rider's ride history from the backend
    api.get('/rides/history')
      .then((response) => {
        setRideHistory(response.data);
      })
      .catch((error) => {
        console.error('Error fetching ride history:', error);
      });
  }, []);

  return (
    <div>
      <h1>Rider Dashboard</h1>
      <h2>Your Ride History:</h2>
      <ul>
        {rideHistory.map((ride) => (
          <li key={ride.id}>
            {ride.pickup_location} to {ride.destination} - {ride.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RiderDashboard;
