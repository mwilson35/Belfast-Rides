import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../services/api';
import '../styles/DriverDashboard.css'; 

// New subcomponent for a single ride history item for drivers
const DriverRideHistoryItem = ({ ride, expanded, onToggle }) => {
  const [mapUrl, setMapUrl] = useState('');

  // When a ride is expanded, we fetch its static map (similar to the rider process)
useEffect(() => {
  if (expanded && ride.encoded_polyline) {
    api.get('/static-map', {
      params: {
        path: ride.encoded_polyline,
        pickup: ride.pickup_location,
        destination: ride.destination,
      },
    })
    .then((response) => {
      setMapUrl(response.data.url);
    })
    .catch((error) => {
      console.error('Error fetching static map:', error);
    });
  }
}, [expanded, ride]);

  return (
    <li
      className={`ride-history-item ${expanded ? 'expanded' : ''}`}
      onClick={onToggle}
    >
      <div className="ride-summary">
        <strong>{ride.pickup_location}</strong> to <strong>{ride.destination}</strong>
        <span className="ride-status"> - {ride.status}</span>
      </div>

      {expanded && (
        <div className="ride-details">
          <p>
            <strong>Date:</strong>{' '}
            {ride.created_at ? new Date(ride.created_at).toLocaleString() : 'N/A'}
          </p>
          <p>
            <strong>Distance:</strong> {ride.distance || 'N/A'} km
          </p>
          <p>
            <strong>Fare:</strong>{' '}
            {ride.fare ? `£${Number(ride.fare).toFixed(2)}` : 'N/A'}
          </p>
          {mapUrl ? (
            <img
              src={mapUrl}
              alt="Ride route map"
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

const DriverRideHistory = () => {
  const [rides, setRides] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get('/rides/history')
      .then((res) => {
        if (Array.isArray(res.data)) {
          console.log('[DEBUG] Fetched driver ride history:', res.data);
          setRides(res.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching ride history:', err);
      });
  }, []);

  return (
    <section className="ride-history-section">
      <h2>Your Ride History</h2>
      {rides && rides.length ? (
        <ul className="ride-history-list">
          {rides.map((ride) => (
            <DriverRideHistoryItem
              key={ride.id}
              ride={ride}
              expanded={expandedId === ride.id}
              onToggle={() =>
                setExpandedId(expandedId === ride.id ? null : ride.id)
              }
            />
          ))}
        </ul>
      ) : (
        <p>No ride history available.</p>
      )}
    </section>
  );
};

export default DriverRideHistory;
