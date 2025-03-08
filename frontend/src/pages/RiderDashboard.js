// src/pages/RiderDashboard.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import InteractiveMap from '../components/InteractiveMap';
import DocumentUpload from '../components/DocumentUpload';
import Notifications from '../components/Notifications';
import RatingModal from '../components/RatingModal';
import ChatBox from '../components/ChatBox';
import polyline from 'polyline';
import RideStatusTimeline from '../components/RideStatusTimeline';
import RideSummary from '../components/RideSummary';


const decodePolyline = (encoded) => {
  const points = polyline.decode(encoded);
  return points.map(point => ({ lat: point[0], lng: point[1] }));
};

const RiderDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [ridePreview, setRidePreview] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [route, setRoute] = useState(null);
  const [notification, setNotification] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRideForRating, setCurrentRideForRating] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [expandedRide, setExpandedRide] = useState(null);
  const [rideSummary, setRideSummary] = useState(null);
const [showRideSummaryModal, setShowRideSummaryModal] = useState(false);


  // Remove persisted preview/route on mount if no active ride exists
  useEffect(() => {
    const storedActiveRide = localStorage.getItem('activeRide');
    if (!storedActiveRide) {
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
    }
  }, []);

  // Fetch ride history
  const fetchRideHistory = () => {
    api.get('/rides/history')
      .then(response => setRideHistory(response.data))
      .catch(error => {
        console.error('Error fetching ride history:', error);
        setNotification('Failed to load ride history.');
      });
  };

  // Fetch user profile
  const fetchProfile = () => {
    api.get('/users/profile')
      .then(response => setProfile(response.data))
      .catch(error => {
        console.error('Error fetching profile:', error);
        setNotification('Failed to load profile.');
      });
  };

  // Fetch active ride from backend and clear preview/route if none exists
  const fetchActiveRide = () => {
    api.get('/rides/active')
      .then(response => {
        console.log('Active ride response:', response.data);
        if (!response.data) {
          localStorage.removeItem('ridePreview');
          localStorage.removeItem('route');
          setRidePreview(null);
          setRoute(null);
        }
        setActiveRide(response.data);
        // Optionally, persist active ride to localStorage if you want it to survive refresh
        if (response.data) {
          localStorage.setItem('activeRide', JSON.stringify(response.data));
        } else {
          localStorage.removeItem('activeRide');
        }
      })
      .catch(error => {
        console.error('Error fetching active ride:', error);
      });
  };

  // Persist ridePreview and route only if needed (optional)
  useEffect(() => {
    if (ridePreview) {
      localStorage.setItem('ridePreview', JSON.stringify(ridePreview));
    } else {
      localStorage.removeItem('ridePreview');
    }
  }, [ridePreview]);

  useEffect(() => {
    if (route) {
      localStorage.setItem('route', JSON.stringify(route));
    } else {
      localStorage.removeItem('route');
    }
  }, [route]);

  // Load persisted preview and route if present (optional)
  useEffect(() => {
    const storedPreview = localStorage.getItem('ridePreview');
    const storedRoute = localStorage.getItem('route');
    if (storedPreview) {
      setRidePreview(JSON.parse(storedPreview));
    }
    if (storedRoute) {
      setRoute(JSON.parse(storedRoute));
    }
  }, []);

  // Fetch route for map display
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


/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  fetchRideHistory();
  fetchProfile();
  fetchActiveRide();

  const socket = require('socket.io-client')('http://localhost:5000');
  
  socket.on('locationUpdate', (data) => {
    console.log('Received locationUpdate event:', data);
    setDriverLocation({ id: 'driver', lat: data.lat, lng: data.lng });
    localStorage.setItem('driverLocation', JSON.stringify({ lat: data.lat, lng: data.lng }));
  });
  
  socket.on('driverAccepted', (data) => {
    console.log('Driver accepted ride:', data);
    setNotification('Your ride has been accepted!');
    setActiveRide(prev => prev ? { ...prev, status: 'accepted' } : prev);
  });
  
  socket.on('driverArrived', (data) => {
    console.log('Driver has arrived:', data);
    setNotification('Your driver has arrived!');
    setActiveRide(prev => prev ? { ...prev, status: 'arrived' } : prev);
  });
  
  socket.on('rideInProgress', (data) => {
    console.log('Ride in progress event:', data);
    setNotification('Your ride is now in progress!');
    setActiveRide(prev => prev ? { ...prev, status: 'in progress' } : prev);
  });
  
  socket.on('rideCompleted', (data) => {
    console.log('Ride completed event fired with data:', data);
    setNotification('Your ride is complete!');
    // Use activeRide if available; otherwise, fallback to event payload.
    const rideDetails = activeRide 
      ? { ...activeRide } 
      : { 
          id: data.rideId, 
          driver_id: data.driver_id, 
          pickup_location: data.pickup_location,
          destination: data.destination,
          created_at: data.created_at,
          distance: data.distance,
          fare: data.fare,
          estimated_fare: data.estimated_fare
        };
    console.log('Setting ride summary for rating:', rideDetails);
    setRideSummary(rideDetails);
    setShowRideSummaryModal(true);
    setTimeout(() => {
      setActiveRide(null);
      fetchRideHistory();
    }, 500);
  });
  
  
  
  const storedDriverLocation = localStorage.getItem('driverLocation');
  if (storedDriverLocation) {
    setDriverLocation(JSON.parse(storedDriverLocation));
  }
  
  return () => {
    socket.off('locationUpdate');
    socket.off('driverAccepted');
    socket.off('driverArrived');
    socket.off('rideInProgress');
    socket.off('rideCompleted');
    socket.disconnect();
  };
}, []);
/* eslint-enable react-hooks/exhaustive-deps */



useEffect(() => {
  let intervalId;
  if (activeRide && driverLocation && destination) {
    intervalId = setInterval(async () => {
      try {
        const response = await api.get('/get-directions', {
          params: {
            origin: `${driverLocation.lat},${driverLocation.lng}`,
            destination: destination
          }
        });
        // Assuming the API returns ETA in response.data.routes[0].legs[0].duration.text
        const duration = response.data.routes[0].legs[0].duration.text;
        setEta(duration);
      } catch (error) {
        console.error('Error fetching ETA:', error);
      }
    }, 30000); // Poll every 30 seconds
  }
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [activeRide, driverLocation, destination]);

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
      setNotification(`Ride requested successfully! Ride ID: ${response.data.rideId || response.data.id}`);
      setRidePreview(null);  // Clear preview since the ride is now requested
      // Set a default status of "requested" if not provided
      setActiveRide({ ...response.data, status: response.data.status || 'requested' });
      fetchRideHistory();
    } catch (error) {
      console.error('Error requesting ride:', error);
      setNotification('Failed to request ride.');
    }
  };
  

  const handleCancelRide = async () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this ride? A cancellation fee may apply.");
    if (!confirmCancel) return;
    try {
      const response = await api.post('/rides/cancel', { rideId: activeRide.rideId || activeRide.id });
      setNotification(`Ride canceled successfully. Cancellation fee: £${response.data.cancellationFee || 0}`);
      setActiveRide(null);
      localStorage.removeItem('activeRide');
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
      localStorage.removeItem('driverLocation');
      setRidePreview(null);
      setRoute(null);
      setDriverLocation(null);
      fetchRideHistory();
    } catch (error) {
      console.error('Error canceling ride:', error);
      setNotification('Failed to cancel ride.');
    }
  };

  // Build markers array for the map
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
    </>
  ) : (
    <p>No active ride currently.</p>
  )}
</section>




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
        <li
          key={ride.id}
          style={{ borderBottom: '1px solid #ccc', padding: '0.5rem', cursor: 'pointer' }}
          onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}
        >
          <div>
            {ride.pickup_location} to {ride.destination} - Status: {ride.status}
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
                <strong>Fare:</strong> {ride.fare ? `£${ride.fare}` : (ride.estimated_fare ? `£${ride.estimated_fare}` : 'N/A')}
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
      {showRideSummaryModal && rideSummary && (
  <RideSummary 
    ride={rideSummary}
    onClose={() => setShowRideSummaryModal(false)}
    onProceedToRating={() => {
      setCurrentRideForRating(rideSummary); // Ensure currentRideForRating is set
      setShowRideSummaryModal(false);
      setShowRatingModal(true);
    }}
  />
)}

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
