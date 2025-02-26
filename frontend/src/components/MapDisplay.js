// src/components/MapDisplay.js
import React from 'react';

const MapDisplay = ({ ridePreview }) => {
  return (
    <div style={{ width: '100%', height: '400px', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Map Placeholder {ridePreview ? `(Preview: ${ridePreview.distance}, ${ridePreview.duration})` : ''}</p>
    </div>
  );
};

export default MapDisplay;
