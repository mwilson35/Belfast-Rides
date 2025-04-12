import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AvailableRidesList from '../components/AvailableRidesList';
import DriverInteractiveMap from '../components/DriverInteractiveMap';
import Earnings from '../components/Earnings';
import ProfileSection from '../components/ProfileSection';
import DriverDocumentUploads from '../components/DriverDocumentUploads';
import ChatBox from '../components/ChatBox';
import '../styles/DriverDashboard.css';

// Helper: Calculate distance (in meters) between two lat/lng points using the Haversine formula.
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}`
  );
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
  const [activeTab, setActiveTab] = useState('rides');
  const [profile, setProfile] = useState(null);

  // NEW: Declare socketRef to store the socket instance
  const socketRef = useRef(null);

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
    socketRef.current = io('http://localhost:5000');
    console.log('Socket connected');
  
    return () => {
      socketRef.current.disconnect();
      console.log('Socket disconnected');
    };
  }, []);
  
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(loc);
  
        // ONLY use existing socket
        socketRef.current?.emit('driverLocationUpdate', loc);
  
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
              socketRef.current?.emit('driverArrived', { rideId: acceptedRide.id, location: loc });
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
    };
  }, [riderLocation, acceptedRide, arrivedPingSent]);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;  
    const handleCancel = ({ rideId }) => {
      setAcceptedRide(prev => {
        if (prev && prev.id === rideId) {
          setRiderLocation(null);
          setDestination(null);
          setMessage('The rider cancelled the ride.');
          return null;
        }
        return prev;
      });
    };
  
    socket.on('rideCancelledByRider', handleCancel);
  
    socket.on('newAvailableRide', (ride) => {
      setAvailableRides((prev) => {
        if (prev.some((r) => r.id === ride.id)) return prev;
        return [...prev, ride];
      });
    });
  
    socket.on('removeRide', (rideId) => {
      setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
    });
  
    return () => {
      socket.off('newAvailableRide');
      socket.off('removeRide');
      socket.off('rideCancelledByRider', handleCancel);
    };
  }, []);
  const handleAcceptRide = async (rideId) => {
    try {
      const res = await api.post('/rides/accept', { rideId });
      if (res.status === 200 && res.data.message) {
        setMessage(res.data.message);
      } else {
        setMessage('Unexpected response from server.');
        console.warn('Unexpected ride accept response:', res);
      }
  
      // The magic: fetch the full ride from the backend
      const response = await api.get(`/rides/accepted-ride-details?rideId=${rideId}`)

      const fullRide = response.data;
  
      setAcceptedRide(fullRide); // now includes decoded_route
      setArrivedPingSent(false);
  
      if (fullRide.pickup_lat && fullRide.pickup_lng) {
        setRiderLocation({ lat: fullRide.pickup_lat, lng: fullRide.pickup_lng });
      }
      if (fullRide.destination_lat && fullRide.destination_lng) {
        setDestination({ lat: fullRide.destination_lat, lng: fullRide.destination_lng });
      }
  
      fetchAvailableRides();
    } catch (err) {
      console.error('Error accepting ride:', err?.response?.data || err.message || err);
      setMessage('Failed to accept ride.');
    }
  };
  
  
  

  // Route Drawing: fetch and update directions every 30 seconds
  useEffect(() => {
    if (acceptedRide?.decoded_route) {
      const route = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: acceptedRide.decoded_route.map(point => [point.lng, point.lat])
            },
            properties: {}
          }
        ]
      };
      setDirections(route);
    }
  }, [acceptedRide]);
  
  // Place inside DriverDashboard.js, after your existing route drawing useEffect
useEffect(() => {
  const interval = setInterval(() => {
    if (acceptedRide?.decoded_route) {
      setDirections({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: acceptedRide.decoded_route.map(p => [p.lng, p.lat])
          }
        }]
      });
    }
  }, 15000);

  return () => clearInterval(interval);
}, [acceptedRide]);


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

// CLEAR THE MAP properly when ride is complete
const clearRideState = () => {
  setAcceptedRide(null);
  setDirections(null);
  setRiderLocation(null);
  setDestination(null);
  setArrivedPingSent(false);
};

const handleCompleteRide = async () => {
  if (!acceptedRide) return;
  try {
    const response = await api.post('/rides/complete', { rideId: acceptedRide.id });
    setMessage(response.data.message || 'Ride completed successfully');
    clearRideState();  // Clear map states
    fetchAvailableRides(); // Refresh available rides
  } catch (error) {
    console.error('Error completing ride:', error);
    setMessage('Failed to complete ride.');
  }
};

const handleCancelRide = async () => {
  try {
    const response = await api.post('/rides/cancel', { rideId: acceptedRide.id });
    setMessage(response.data.message || 'Ride cancelled successfully');
    socketRef.current.emit('rideCancelled', { rideId: acceptedRide.id });
    clearRideState();  // Clear map states
    fetchAvailableRides(); // Refresh available rides
  } catch (error) {
    console.error('Error cancelling ride:', error);
    setMessage('Failed to cancel ride.');
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
         
{message && (
  <div className="alert">
    {message}
  </div>
)}

          {activeTab === 'rides' && (
            !acceptedRide ? (
              <AvailableRidesList rides={availableRides} onAcceptRide={handleAcceptRide} />
            ) : (
              <div>
                <p>Ride {acceptedRide.id} accepted.</p>
                {acceptedRide.status !== 'in_progress' ? (
                  <div>
                    {driverLocation && riderLocation &&
                    getDistanceFromLatLonInMeters(
                      driverLocation.lat,
                      driverLocation.lng,
                      riderLocation.lat,
                      riderLocation.lng
                    ) < 55 ? (
                      <button onClick={handleStartRide}>Start Ride</button>
                    ) : (
                      <p>Move closer to pickup location</p>
                    )}
                    <button onClick={handleCancelRide}>Cancel Ride</button>
                  </div>
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
