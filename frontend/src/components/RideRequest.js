import React from 'react';
import '../styles/RideRequest.css'; // Link to the CSS file located at C:\Users\user\Documents\Projects\Belfast-Rides\frontend\src\styles\RideRequest.css

const RideRequest = ({
  pickupLocation,
  setPickupLocation,
  destination,
  setDestination,
  ridePreview,
  handlePreviewRide,
  handleRequestRide,
}) => (
  <section className="ride-request-section container my-4">
    <h2 className="mb-3 text-center">Request a Ride</h2>
    <form onSubmit={handlePreviewRide}>
      <div className="form-group mb-3">
        <label htmlFor="pickupLocation" className="form-label">Pickup Location:</label>
        <input
          type="text"
          id="pickupLocation"
          className="form-control"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          required
        />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="destination" className="form-label">Destination:</label>
        <input
          type="text"
          id="destination"
          className="form-control"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
      </div>
      <div className="text-center">
        <button type="submit" className="btn btn-primary">Preview Ride</button>
      </div>
    </form>
    {ridePreview && (
      <div className="ride-preview mt-3 p-3 border rounded shadow-sm bg-light">
        <p className="mb-2"><strong>Ride Preview:</strong></p>
        <p className="mb-1">Distance: {ridePreview.distance}</p>
        <p className="mb-1">Duration: {ridePreview.duration}</p>
        <p className="mb-2">Estimated Fare: {ridePreview.estimatedFare}</p>
        <div className="text-center">
          <button onClick={handleRequestRide} className="btn btn-success">Request Ride</button>
        </div>
      </div>
    )}
  </section>
);

export default RideRequest;
