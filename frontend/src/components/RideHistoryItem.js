import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RideHistoryItem = ({ ride, expanded, onToggle, onRebook }) => {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (expanded) {
      axios
        .get('http://localhost:5000/static-map', {
          params: {
            center: ride.pickup_location,
            zoom: 10,
            path: ride.encoded_polyline, // must match the column name from your DB
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
    <li
      key={ride.id}
      style={{ borderBottom: '1px solid #ccc', padding: '0.5rem', cursor: 'pointer' }}
      onClick={onToggle}
    >
      <div>
        {ride.pickup_location} to {ride.destination} - Status: {ride.status}
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRebook();
          }}
        >
          Rebook Ride
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
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
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover',
                marginTop: '0.5rem',
              }}
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
