import React from 'react';

const RideSummary = ({ ride, onClose, onProceedToRating }) => {
  if (!ride) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px'
      }}>
        <h3>Ride Summary</h3>
        <p><strong>From:</strong> {ride.pickup_location}</p>
        <p><strong>To:</strong> {ride.destination}</p>
        <p>
          <strong>Date:</strong>{' '}
          {ride.created_at ? new Date(ride.created_at).toLocaleString() : 'N/A'}
        </p>
        <p><strong>Distance:</strong> {ride.distance || 'N/A'} km</p>
        <p>
          <strong>Fare:</strong>{' '}
          {ride.fare ? `£${ride.fare}` : (ride.estimated_fare ? `£${ride.estimated_fare}` : 'N/A')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={onClose} style={{ marginRight: '1rem' }}>Close</button>
          <button onClick={onProceedToRating}>Rate Driver</button>
        </div>
      </div>
    </div>
  );
};

export default RideSummary;
