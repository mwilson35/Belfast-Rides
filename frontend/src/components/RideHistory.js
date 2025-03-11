import React from 'react';

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
        <ul>
          {rideHistory.map((ride) => (
            <li
              key={ride.id}
              style={{
                borderBottom: '1px solid #ccc',
                padding: '0.5rem',
                cursor: 'pointer',
              }}
              onClick={() =>
                setExpandedRide(expandedRide === ride.id ? null : ride.id)
              }
            >
              <div>
                {ride.pickup_location} to {ride.destination} - Status: {ride.status}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  onClick={(e) => {
                    // Prevent the li's onClick from firing
                    e.stopPropagation();
                    // Populate the ride request form with this ride's details for rebooking
                    setPickupLocation(ride.pickup_location);
                    setDestination(ride.destination);
                    // Optionally, scroll to the request form
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Rebook Ride
                </button>
              </div>
              {expandedRide === ride.id && (
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
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No ride history available.</p>
      )}
    </section>
  );
};

export default RideHistory;
