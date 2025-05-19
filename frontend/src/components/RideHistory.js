import React from 'react';
import RideHistoryItem from './RideHistoryItem';
import '../styles/RideHistory.css'; 

const RideHistory = ({
  rideHistory,
  expandedRide,
  setExpandedRide,
  setPickupLocation,
  setDestination,
}) => {
  return (
    <section className="ride-history-section">
      <h2>Your Ride History</h2>
      {rideHistory && rideHistory.length ? (
        <ul className="ride-history-list">
          {rideHistory.map((ride) => (
            <RideHistoryItem
              key={ride.id}
              ride={ride}
              expanded={expandedRide === ride.id}
              onToggle={() =>
                setExpandedRide(expandedRide === ride.id ? null : ride.id)
              }
              onRebook={() => {
                setPickupLocation(ride.pickup_location);
                setDestination(ride.destination);
                const rideRequestSection = document.getElementById('rideRequest');
                if (rideRequestSection) {
                  rideRequestSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              
            />
          ))}
        </ul>
      ) : (
        <p>No ride history available.</p>
      )}
    </section>
  );
};

export default RideHistory;
