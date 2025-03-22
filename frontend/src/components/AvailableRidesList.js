import React from 'react';
import '../styles/DriverDashboard.css';

const AvailableRidesList = ({ rides, onAcceptRide }) => {
  return rides && rides.length ? (
    <ul className="available-rides-list list-unstyled">
      {rides.map((ride) => (
        <li key={ride.id} className="available-ride-item border p-3 mb-2 d-flex justify-content-between align-items-center">
          <div>
            <strong>{ride.pickup_location}</strong> to <strong>{ride.destination}</strong> – Status: {ride.status}
          </div>
          <button onClick={() => onAcceptRide(ride.id)} className="btn btn-success">
            Accept Ride
          </button>
        </li>
      ))}
    </ul>
  ) : (
    <p>No available rides at the moment.</p>
  );
};

export default AvailableRidesList;
