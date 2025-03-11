// DriverDetails.js
import React from 'react';

const containerStyle = {
  marginTop: '1rem',
  padding: '0.5rem',
  border: '1px solid #aaa'
};

const DriverDetails = ({ driverDetails, driverRating }) => {
  if (!driverDetails) return null; // Guard clause if no details

  const { username, vehicle_description, vehicle_reg } = driverDetails;
  const ratingText = driverRating?.avgRating ? Number(driverRating.avgRating).toFixed(1) : 'N/A';
  const totalReviews = driverRating?.totalRatings ?? 0;

  return (
    <div style={containerStyle}>
      <h3>Driver Details</h3>
      <p><strong>Name:</strong> {username}</p>
      <p>
        <strong>Vehicle:</strong> {vehicle_description || 'N/A'}
        {vehicle_reg && ` reg ${vehicle_reg}`}
      </p>
      {driverRating && (
        <p>
          <strong>Rating:</strong> {ratingText} (from {totalReviews} reviews)
        </p>
      )}
    </div>
  );
};

export default DriverDetails;
