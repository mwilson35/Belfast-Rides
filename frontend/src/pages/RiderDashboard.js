// src/pages/RiderDashboard.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
// Replace the MapDisplay import with InteractiveMap:
import InteractiveMap from '../components/InteractiveMap';
import DocumentUpload from '../components/DocumentUpload';
import Notifications from '../components/Notifications';
import RatingModal from '../components/RatingModal';

const RiderDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [ridePreview, setRidePreview] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [notification, setNotification] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRideForRating, setCurrentRideForRating] = useState(null);

  useEffect(() => {
    fetchRideHistory();
    fetchProfile();
  }, []);

  const fetchRideHistory = () => {
    api.get('/rides/history')
      .then(response => setRideHistory(response.data))
      .catch(error => {
        console.error('Error fetching ride history:', error);
        setNotification('Failed to load ride history.');
      });
  };

  const fetchProfile = () => {
    api.get('/users/profile')
      .then(response => setProfile(response.data))
      .catch(error => {
        console.error('Error fetching profile:', error);
        setNotification('Failed to load profile.');
      });
  };

  const handlePreviewRide = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/rides/preview', { pickupLocation, destination });
      setRidePreview(response.data);
      setNotification('Ride preview loaded.');
    } catch (error) {
      console.error('Error previewing ride:', error);
      setNotification('Failed to preview ride.');
    }
  };

  const handleRequestRide = async () => {
    try {
      const response = await api.post('/rides/request', { pickupLocation, destination });
      setNotification(`Ride requested successfully! Ride ID: ${response.data.rideId}`);
      setRidePreview(null);
      fetchRideHistory();
    } catch (error) {
      console.error('Error requesting ride:', error);
      setNotification('Failed to request ride.');
    }
  };

  return (
    <div>
      <Navbar />
      <Notifications />
      <div style={{ padding: '1rem' }}>
        <h1>Rider Dashboard</h1>
        
        {/* Profile Section */}
        <section className="profile-section">
          <h2>Your Profile</h2>
          {profile ? (
            <div>
              <p><strong>Name:</strong> {profile.username}</p>
              <p><strong>Email:</strong> {profile.email}</p>
            </div>
          ) : (
            <p>Loading profile...</p>
          )}
        </section>
        
        {/* Documents Section */}
        <section className="documents-section">
          <h2>Your Documents</h2>
          <DocumentUpload documentType="profilePhoto" />
        </section>
    
        {/* Ride Request Section */}
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

        {/* Map Section */}
        <section className="map-section">
          <h2>Live Map</h2>
          {/* Replace MapDisplay with InteractiveMap and provide markers as needed */}
          <InteractiveMap markers={[
            // Example marker for testing; adjust as needed
            { id: 1, lat: 54.5973, lng: -5.9301 }
          ]} />
        </section>

        {/* Ride History Section */}
        <section className="ride-history-section">
          <h2>Your Ride History</h2>
          {rideHistory && rideHistory.length ? (
            <ul>
              {rideHistory.map((ride) => (
                <li key={ride.id}>
                  {ride.pickup_location} to {ride.destination} - Status: {ride.status}
                  {ride.status === 'completed' && (
                    <button 
                      onClick={() => {
                        setCurrentRideForRating(ride);
                        setShowRatingModal(true);
                      }}
                      style={{ marginLeft: '1rem' }}
                    >
                      Rate Driver
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No ride history available.</p>
          )}
        </section>

        {/* Notification Section */}
        {notification && (
          <section className="notification-section" style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fdd' }}>
            <p>{notification}</p>
          </section>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && currentRideForRating && (
        <RatingModal 
          rideId={currentRideForRating.id}
          rateeId={currentRideForRating.driver_id} // Ensure this field exists in your ride object
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={() => fetchRideHistory()}
        />
      )}
    </div>
  );
};

export default RiderDashboard;
