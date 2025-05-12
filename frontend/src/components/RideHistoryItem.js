import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/RideHistory.css'; // Import RideHistory styles
import api from '../services/api';


const RideHistoryItem = ({ ride, expanded, onToggle, onRebook }) => {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
  if (expanded) {
    api
      .get('/static-map', {
        params: {
          path: ride.encoded_polyline,
          pickup: ride.pickup_location,
          destination: ride.destination,
        },
      })
      .then((response) => {
        console.log('Static map response:', response.data);
        setMapUrl(response.data.url);
      })
      .catch((error) => {
        console.error('Error fetching static map:', error);
      });
  }
}, [expanded, ride]);


  return (
    <li className="ride-history-item" onClick={onToggle}>
      <div className="ride-summary">
        {ride.pickup_location} to {ride.destination} - Status: {ride.status}
      </div>
      <div className="text-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRebook();
          }}
          className="btn btn-outline-primary rebook-btn"
        >
          Rebook Ride
        </button>
      </div>
      {expanded && (
        <div className="ride-history-details">
          <p>
            <strong>Date:</strong>{' '}
            {ride.created_at ? new Date(ride.created_at).toLocaleString() : 'N/A'}
          </p>
          <p>
            <strong>Distance:</strong> {ride.distance || 'N/A'}
          </p>
          <p>
            <strong>Fare:</strong>{' '}
            {ride.fare
              ? `£${ride.fare}`
              : ride.estimated_fare
              ? `£${ride.estimated_fare}`
              : 'N/A'}
          </p>
          {mapUrl ? (
            <img
              src={mapUrl}
              alt="Static map"
              className="ride-history-map"
            />
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      )}
    </li>
  );
};

export default RideHistoryItem;
