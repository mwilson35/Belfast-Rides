// src/components/Notifications.js
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); // Ensure this is the correct URL

const Notifications = () => {
  const [notification, setNotification] = useState('');

  useEffect(() => {
    console.log("Socket connection attempt", socket);
    socket.on('connect', () => {
      console.log("Socket connected:", socket.id);
    });
    socket.on('driverArrived', (data) => {
      console.log("Received driverArrived event:", data);
      setNotification(`Driver has arrived for ride ${data.rideId}`);
    });
    
    // Clean up on unmount
    return () => {
      socket.off('driverArrived');
      socket.off('connect');
    };
  }, []);

  return notification ? (
    <div style={{ backgroundColor: '#ffcccc', padding: '10px', margin: '10px 0' }}>
      {notification}
    </div>
  ) : null;
};

export default Notifications;
