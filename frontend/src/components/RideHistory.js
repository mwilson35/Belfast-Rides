import React from 'react';
import RideHistoryItem from './RideHistoryItem';

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
        <ul style={{ listStyle: 'none', padding: 0 }}>
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
