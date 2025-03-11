// src/components/RideRequest.js
import React from 'react';

const RideRequest = ({
  pickupLocation,
  setPickupLocation,
  destination,
  setDestination,
  ridePreview,
  handlePreviewRide,
  handleRequestRide,
}) => (
  <section className="ride-request-section">
    <h2>Request a Ride</h2>
    <form onSubmit={handlePreviewRide}>
      <div>
        <label>Pickup Location:</label>
        <input
          type="text"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Destination:</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
      </div>
      <button type="submit">Preview Ride</button>
    </form>
    {ridePreview && (
      <div style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
        <p><strong>Ride Preview:</strong></p>
        <p>Distance: {ridePreview.distance}</p>
        <p>Duration: {ridePreview.duration}</p>
        <p>Estimated Fare: {ridePreview.estimatedFare}</p>
        <button onClick={handleRequestRide}>Request Ride</button>
      </div>
    )}
  </section>
);

export default RideRequest;
