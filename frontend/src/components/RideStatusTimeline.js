// src/components/RideStatusTimeline.js
import React from 'react';

const RideStatusTimeline = ({ status }) => {
  // Define the ride statuses in order
  const statuses = ['requested', 'accepted', 'arrived', 'in progress', 'completed'];
  const currentIndex = statuses.indexOf(status);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      {statuses.map((s, i) => (
        <div key={s} style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              fontWeight: i <= currentIndex ? 'bold' : 'normal',
              color: i <= currentIndex ? 'green' : 'gray',
              marginBottom: '5px'
            }}
          >
            {s.toUpperCase()}
          </div>
          {i < statuses.length - 1 && (
            <div style={{ borderTop: '2px solid', borderColor: i < currentIndex ? 'green' : 'gray' }}></div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RideStatusTimeline;
