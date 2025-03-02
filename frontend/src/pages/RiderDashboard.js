// src/pages/RiderDashboard.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import InteractiveMap from '../components/InteractiveMap';
import DocumentUpload from '../components/DocumentUpload';
import Notifications from '../components/Notifications';
import RatingModal from '../components/RatingModal';
import ChatBox from '../components/ChatBox'; // New ChatBox component
import polyline from 'polyline';

const decodePolyline = (encoded) => {
  const points = polyline.decode(encoded);
  return points.map(point => ({ lat: point[0], lng: point[1] }));
};

const RiderDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [ridePreview, setRidePreview] = useState(null);
  const [activeRide, setActiveRide] = useState(null); // Active ride state
  const [rideHistory, setRideHistory] = useState([]);
  const [route, setRoute] = useState(null);
  const [notification, setNotification] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRideForRating, setCurrentRideForRating] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  // Socket.IO integration for ride status and driver tracking
  useEffect(() => {
    fetchRideHistory();
    fetchProfile();

    const socket = require('socket.io-client')('http://localhost:5000');
    
    socket.on('locationUpdate', (data) => {
      console.log('Received locationUpdate event:', data);
      setDriverLocation({ id: 'driver', lat: data.lat, lng: data.lng });
    });

    socket.on('driverAccepted', (data) => {
      console.log('Driver accepted ride:', data);
      setNotification('Your ride has been accepted!');
    });

    socket.on('driverArrived', (data) => {
      console.log('Driver has arrived:', data);
      setNotification('Your driver has arrived!');
    });

    return () => {
      socket.off('locationUpdate');
      socket.off('driverAccepted');
      socket.off('driverArrived');
      socket.disconnect();
    };
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

  const fetchRoute = async (origin, destination) => {
    try {
      const response = await api.get('/get-directions', { params: { origin, destination } });
      const encodedPolyline = response.data.routes[0].overview_polyline.points;
      const decodedPath = decodePolyline(encodedPolyline);
      setRoute(decodedPath);
    } catch (error) {
      console.error('Error fetching route:', error);
      setNotification('Failed to fetch route.');
    }
  };

  const handlePreviewRide = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/rides/preview', { pickupLocation, destination });
      setRidePreview(response.data);
      setNotification('Ride preview loaded.');
      fetchRoute(pickupLocation, destination);
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
      setActiveRide(response.data);  // Save active ride so Cancel button appears
      fetchRideHistory();
    } catch (error) {
      console.error('Error requesting ride:', error);
      setNotification('Failed to request ride.');
    }
  };

  const handleCancelRide = async () => {
    // Show confirmation dialog before canceling the ride.
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this ride? A cancellation fee may apply."
    );
    if (!confirmCancel) return;

    try {
      const response = await api.post('/rides/cancel', { rideId: activeRide.rideId });
      setNotification(`Ride canceled successfully. Cancellation fee: £${response.data.cancellationFee || 0}`);
      setActiveRide(null);
      fetchRideHistory();
    } catch (error) {
      console.error('Error canceling ride:', error);
      setNotification('Failed to cancel ride.');
    }
  };

  // Build markers array only from available live data
  const markers = [];
  if (ridePreview && ridePreview.pickupLat && ridePreview.pickupLng) {
    markers.push({ id: 'pickup', lat: ridePreview.pickupLat, lng: ridePreview.pickupLng });
  }
  if (driverLocation) {
    markers.push(driverLocation);
  }

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

        {/* Active Ride Section */}
        {activeRide && (
          <section className="active-ride-section" style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
            <h2>Active Ride</h2>
            <p><strong>Ride ID:</strong> {activeRide.rideId}</p>
            <p><strong>Status:</strong> {activeRide.status || 'requested'}</p>
            <button onClick={handleCancelRide}>Cancel Ride</button>
          </section>
        )}

        {/* Map Section */}
        <section className="map-section">
          <h2>Live Map</h2>
          <InteractiveMap markers={markers} route={route} />
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

        {/* Chat Section */}
        <section className="chat-section" style={{ marginTop: '1rem' }}>
          <h2>Chat</h2>
          <ChatBox />
        </section>
      </div>

      {/* Rating Modal */}
      {showRatingModal && currentRideForRating && (
        <RatingModal 
          rideId={currentRideForRating.id}
          rateeId={currentRideForRating.driver_id}
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={() => fetchRideHistory()}
        />
      )}
    </div>
  );
};

export default RiderDashboard;
