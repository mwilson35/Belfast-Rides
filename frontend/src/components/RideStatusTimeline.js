
import React from 'react';
import '../styles/Dashboard.css'; 

const RideStatusTimeline = ({ status }) => {
  const statuses = ['requested', 'accepted', 'arrived', 'in_progress', 'completed'];
  const currentIndex = statuses.indexOf(status);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      {statuses.map((s, i) => (
        <div key={s} style={{ flex: 1, textAlign: 'center' }}>
          <div
            className="ride-status-text"
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
