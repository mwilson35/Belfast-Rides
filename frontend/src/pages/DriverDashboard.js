// src/pages/DriverDashboard.js
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AvailableRidesList from '../components/AvailableRidesList';
import DriverInteractiveMap from '../components/DriverInteractiveMap';
import Earnings from '../components/Earnings';
import ProfileSection from '../components/ProfileSection';
import DriverDocumentUploads from '../components/DriverDocumentUploads'; // New component for document uploads
import ChatBox from '../components/ChatBox'; // Import ChatBox component
import '../styles/DriverDashboard.css';

// Helper: Calculate distance (in meters) between two lat/lng points using the Haversine formula.
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const geocodeAddress = async (address) => {
  const token = process.env.REACT_APP_MAPBOX_TOKEN;
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}`);
  const data = await response.json();
  if (!data.features || !data.features.length) throw new Error('No geocoding results');
  const [lng, lat] = data.features[0].center;
  return { lat, lng };
};


const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directions, setDirections] = useState(null);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [arrivedPingSent, setArrivedPingSent] = useState(false);
  // Active tab: "rides", "earnings", "documents", "profile", "chat"
  const [activeTab, setActiveTab] = useState('rides');
  const [profile, setProfile] = useState(null);

  // Fetch available rides on mount
  const fetchAvailableRides = () => {
    api.get('/rides/available')
      .then((res) => setAvailableRides(res.data))
      .catch((err) => console.error('Error fetching available rides:', err));
  };

  useEffect(() => {
    fetchAvailableRides();
  }, []);

  // Socket and geolocation: update driver location and check for arrival
  useEffect(() => {
    const socket = io('http://localhost:5000');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(loc);
        socket.emit('driverLocationUpdate', loc);

        if (riderLocation && acceptedRide && !arrivedPingSent) {
          const distance = getDistanceFromLatLonInMeters(
            loc.lat,
            loc.lng,
            riderLocation.lat,
            riderLocation.lng
          );
          console.log('Distance to pickup:', distance);
          if (distance < 55) {
            setTimeout(() => {
              socket.emit('driverArrived', { rideId: acceptedRide.id, location: loc });
              setArrivedPingSent(true);
            }, 2000);
          }
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [riderLocation, acceptedRide, arrivedPingSent]);

  // Route Drawing: fetch and update directions every 30 seconds
  useEffect(() => {
    let intervalId;
    const fetchDirections = async () => {
      if (!driverLocation) return;
      const token = process.env.REACT_APP_MAPBOX_TOKEN;
      let url;
      // If ride has started, show driver -> destination route
      if (acceptedRide && acceptedRide.status === 'in_progress' && destination) {
        url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${destination.lng},${destination.lat}?access_token=${token}&geometries=geojson`;
      }
      // Otherwise, show driver -> pickup -> destination route
      else if (driverLocation && riderLocation && destination) {
        url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${riderLocation.lng},${riderLocation.lat};${destination.lng},${destination.lat}?access_token=${token}&geometries=geojson`;
      } else {
        return;
      }
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length) {
          const geometry = data.routes[0].geometry;
          const geojsonRoute =
            geometry.type === 'LineString'
              ? { type: 'Feature', geometry, properties: {} }
              : geometry;
          setDirections(geojsonRoute);
        } else {
          console.warn('No directions found.');
        }
      } catch (err) {
        console.error('Error fetching directions:', err);
      }
    };
    fetchDirections();
    intervalId = setInterval(fetchDirections, 30000);
    return () => clearInterval(intervalId);
  }, [driverLocation, riderLocation, destination, acceptedRide]);
  
  
    


  const handleAcceptRide = async (rideId) => {
    try {
      const res = await api.post('/rides/accept', { rideId });
      
      if (res.status === 200 && res.data.message) {
        setMessage(res.data.message); 
      } else {
        setMessage('Unexpected response from server.');
        console.warn('Unexpected ride accept response:', res);
      }
  
      const ride = availableRides.find((r) => r.id === rideId);
      setAcceptedRide(ride);
      setArrivedPingSent(false);
  
      if (ride?.pickup_location) {
        setRiderLocation(await geocodeAddress(ride.pickup_location));
      }
      if (ride?.destination) {
        setDestination(await geocodeAddress(ride.destination));
      }
  
      fetchAvailableRides();
    } catch (err) {
      console.error('Error accepting ride:', err?.response?.data || err.message || err);
      setMessage('Failed to accept ride.');
    }
  };
  

  const handleStartRide = async () => {
    if (!acceptedRide) return;
    try {
      const response = await api.post('/rides/start', { rideId: acceptedRide.id });
      setMessage(response.data.message || 'Ride started successfully');
      setRiderLocation(null);
      setAcceptedRide((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
    } catch (error) {
      console.error('Error starting ride:', error);
      setMessage('Failed to start ride.');
    }
  };

  const handleCompleteRide = async () => {
    if (!acceptedRide) return;
    try {
      const response = await api.post('/rides/complete', { rideId: acceptedRide.id });
      setMessage(response.data.message || 'Ride completed successfully');
      setAcceptedRide(null);
    } catch (error) {
      console.error('Error completing ride:', error);
      setMessage('Failed to complete ride.');
    }
  };

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/profile');
        setProfile(res.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // Prepare markers for the map
  const markers = [];
  if (driverLocation) markers.push({ id: 'driver', ...driverLocation, label: 'D' });
  if (riderLocation) markers.push({ id: 'pickup', ...riderLocation, label: 'P' });
  if (destination) markers.push({ id: 'dropoff', ...destination, label: 'X' });

  return (
    <div className="driver-dashboard">
      <Navbar />
      <div className="driver-dashboard-content">
        <div className="map-section">
        <DriverInteractiveMap
  markers={markers}
  center={driverLocation}
  zoom={16}
  autoFit={acceptedRide ? false : true} // disable auto-fit when a ride is accepted
  directions={directions}
  acceptedRide={acceptedRide}
/>


        </div>
        <div className="ride-requests-panel">
          {/* Tab Header */}
          <div className="tabs">
            <button 
              className={activeTab === 'rides' ? 'active' : ''}
              onClick={() => setActiveTab('rides')}
            >
              Available Rides
            </button>
            <button 
              className={activeTab === 'earnings' ? 'active' : ''}
              onClick={() => setActiveTab('earnings')}
            >
              Earnings
            </button>
            <button 
              className={activeTab === 'documents' ? 'active' : ''}
              onClick={() => setActiveTab('documents')}
            >
              Documents
            </button>
            <button 
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button 
              className={activeTab === 'chat' ? 'active' : ''}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
          </div>
          
          {/* Tab Content */}
          {message && <div className="alert alert-info">{message}</div>}
          {activeTab === 'rides' && (
            !acceptedRide ? (
              <AvailableRidesList rides={availableRides} onAcceptRide={handleAcceptRide} />
            ) : (
              <div>
                <p>Ride {acceptedRide.id} accepted.</p>
                {acceptedRide.status !== 'in_progress' ? (
                  <button onClick={handleStartRide}>Start Ride</button>
                ) : (
                  <button onClick={handleCompleteRide}>Complete Ride</button>
                )}
              </div>
            )
          )}
          {activeTab === 'earnings' && (
            <Earnings />
          )}
          {activeTab === 'documents' && (
            <section className="documents-section">
              <h2>Your Documents</h2>
              <DriverDocumentUploads />
            </section>
          )}
          {activeTab === 'profile' && (
            <section className="profile-section">
              <h2>Your Profile</h2>
              <ProfileSection profile={profile} />
            </section>
          )}
          {/* Persistently mounted ChatBox: */}
          <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
            <h2>Chat</h2>
            {acceptedRide ? (
              <ChatBox rideId={acceptedRide.id} role="Driver" />
            ) : (
              <p>No active ride available. Wait for a ride assignment to start chatting.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
