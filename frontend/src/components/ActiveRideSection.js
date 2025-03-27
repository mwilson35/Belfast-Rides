// src/components/ActiveRideSection.js
import React from 'react';
import RideStatusTimeline from './RideStatusTimeline';
import DriverDetails from './DriverDetails';

const ActiveRideSection = ({ activeRide, eta, handleCancelRide }) => {
  if (!activeRide) return <p>No active ride currently.</p>;

  const status = activeRide.status ? activeRide.status.toLowerCase() : '';
  let progressValue = 0;
  if (status === 'requested') progressValue = 25;
  else if (status === 'accepted') progressValue = 50;
  else if (status === 'arrived') progressValue = 60; 
  else if (status === 'in progress') progressValue = 75;
  else if (status === 'completed') progressValue = 100;
  

  return (
    <section
      className="active-ride-section"
      style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' }}
    >
      <h2>Active Ride</h2>
      <p><strong>Ride ID:</strong> {activeRide.rideId || activeRide.id}</p>
      <p><strong>Status:</strong> {activeRide.status || 'requested'}</p>
      {eta && <p><strong>ETA:</strong> {eta}</p>}
      <RideStatusTimeline status={activeRide.status || 'requested'} />

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progressValue}%` }}>
          <span className="progress-text">{progressValue}%</span>
        </div>
      </div>

      <button 
        className="btn btn-danger"
        onClick={handleCancelRide}
        disabled={!(status === 'requested' || status === 'accepted')}
      >
        Cancel Ride
      </button>

      {(status === 'accepted' || status === 'in progress') && activeRide.driverDetails && (
        <DriverDetails 
          driverDetails={activeRide.driverDetails} 
          driverRating={activeRide.driverRating} 
        />
      )}
    </section>
  );
};

export default ActiveRideSection;
