// src/components/ActiveRideSection.js
import React from 'react';
import RideStatusTimeline from './RideStatusTimeline';
import DriverDetails from './DriverDetails';

const ActiveRideSection = ({ activeRide, eta, handleCancelRide }) => (
  <section className="active-ride-section" style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
    <h2>Active Ride</h2>
    {activeRide ? (
      <>
        <p><strong>Ride ID:</strong> {activeRide.rideId || activeRide.id}</p>
        <p><strong>Status:</strong> {activeRide.status || 'requested'}</p>
        {eta && <p><strong>ETA:</strong> {eta}</p>}
        <RideStatusTimeline status={activeRide.status || 'requested'} />
        <button 
          onClick={handleCancelRide} 
          disabled={!(activeRide.status === 'requested' || activeRide.status === 'accepted')}
        >
          Cancel Ride
        </button>
        {(activeRide.status === 'accepted' || activeRide.status === 'in_progress') && activeRide.driverDetails && (
          <DriverDetails 
            driverDetails={activeRide.driverDetails} 
            driverRating={activeRide.driverRating} 
          />
        )}
      </>
    ) : (
      <p>No active ride currently.</p>
    )}
  </section>
);

export default ActiveRideSection;
