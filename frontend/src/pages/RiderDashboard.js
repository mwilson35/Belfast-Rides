import '../styles/Dashboard.css';
import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DocumentUpload from '../components/DocumentUpload';
import Notifications from '../components/Notifications';
import RatingModal from '../components/RatingModal';
import ChatBox from '../components/ChatBox';
import RideSummary from '../components/RideSummary';
import ProfileSection from '../components/ProfileSection';
import RideRequest from '../components/RideRequest';
import ActiveRideSection from '../components/ActiveRideSection';
import MapSection from '../components/MapSection';
import RideHistory from '../components/RideHistory';
import {
  fetchRideHistory,
  fetchProfile,
  fetchActiveRide,
  fetchAcceptedRideDetails,
  fetchRouteData,
} from '../services/rideService';

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
  const [activeTab, setActiveTab] = useState('rideRequest');

  const activeRideRef = useRef(activeRide);
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // NEW: Declare socketRef so it's available throughout
  const socketRef = useRef(null);

  useEffect(() => {
    const storedActiveRide = localStorage.getItem('activeRide');
    if (!storedActiveRide) {
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
    }
  }, []);

  useEffect(() => {
    const storedPreview = localStorage.getItem('ridePreview');
    const storedRoute = localStorage.getItem('route');
    if (storedPreview) setRidePreview(JSON.parse(storedPreview));
    if (storedRoute) setRoute(JSON.parse(storedRoute));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const historyData = await fetchRideHistory();
        setRideHistory(historyData);
      } catch (error) {
        setNotification('Failed to load ride history.');
      }
      try {
        const profileData = await fetchProfile();
        setProfile(profileData);
      } catch (error) {
        setNotification('Failed to load profile.');
      }
      try {
        const activeRideData = await fetchActiveRide();
        if (!activeRideData) {
          localStorage.removeItem('ridePreview');
          localStorage.removeItem('route');
          setRidePreview(null);
          setRoute(null);
          setActiveRide(null);
          return;
        }
        if (activeRideData.status === 'accepted') {
          try {
            const enrichedRide = await fetchAcceptedRideDetails(activeRideData.id);
            setActiveRide(enrichedRide);
            localStorage.setItem('activeRide', JSON.stringify(enrichedRide));
          } catch (error) {
            setActiveRide(activeRideData);
            localStorage.setItem('activeRide', JSON.stringify(activeRideData));
          }
        } else {
          setActiveRide(activeRideData);
          localStorage.setItem('activeRide', JSON.stringify(activeRideData));
        }
      } catch (error) {
        console.error('Error fetching active ride:', error);
      }
    };
    loadData();
  }, []);

  // Socket setup using socketRef
  useEffect(() => {
    socketRef.current = require('socket.io-client')('http://localhost:5000');
    
    socketRef.current.on('locationUpdate', (data) => {
      setDriverLocation({ id: 'driver', lat: data.lat, lng: data.lng });
      localStorage.setItem('driverLocation', JSON.stringify({ lat: data.lat, lng: data.lng }));
    });
  
    socketRef.current.on('driverAccepted', async (data) => {
      setNotification('Your ride has been accepted!');
      try {
        const rideId =
          data.rideId ||
          (activeRideRef.current && (activeRideRef.current.rideId || activeRideRef.current.id));
        if (!rideId) return;
        const response = await api.get('/rides/accepted-ride-details', { params: { rideId } });
        setActiveRide(response.data);
      } catch (error) {
        setActiveRide((prev) => (prev ? { ...prev, status: 'accepted' } : prev));
      }
    });
  
    socketRef.current.on('driverArrived', () => {
      setNotification('Your driver has arrived!');
      setActiveRide((prev) => (prev ? { ...prev, status: 'arrived' } : prev));
    });
  
    socketRef.current.on('rideInProgress', () => {
      setNotification('Your ride is now in progress!');
      setActiveRide((prev) => (prev ? { ...prev, status: 'in progress' } : prev));
    });
  
    socketRef.current.on('rideCompleted', (data) => {
      setNotification('Your ride is complete!');
      const rideDetails = activeRideRef.current || data;
      setRideSummary(rideDetails);
      setShowRideSummaryModal(true);
      setTimeout(() => {
        setActiveRide(null);
        fetchRideHistory().then(setRideHistory).catch(() =>
          setNotification('Failed to load ride history.')
        );
      }, 500);
    });
  
    // Listener for ride cancellation:
    socketRef.current.on('rideCancelled', (data) => {
      console.log('rideCancelled event received:', data);
      setNotification('Your ride has been cancelled by the driver.');
      setActiveRide(null);
    });
    
    
  
    const storedDriverLocation = localStorage.getItem('driverLocation');
    if (storedDriverLocation) setDriverLocation(JSON.parse(storedDriverLocation));
  
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    let intervalId;
    if (activeRide && driverLocation && destination) {
      intervalId = setInterval(async () => {
        try {
          const response = await api.get('/get-directions', {
            params: {
              origin: `${driverLocation.lat},${driverLocation.lng}`,
              destination,
            },
          });
          const duration = response.data.routes[0].legs[0].duration.text;
          setEta(duration);
        } catch (error) {
          console.error('Error fetching ETA:', error);
        }
      }, 30000);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [activeRide, driverLocation, destination]);

  useEffect(() => {
    const pollActiveRideStatus = async () => {
      try {
        const activeRideData = await fetchActiveRide();
        if (activeRideData?.status === 'arrived') {
          setActiveRide((prev) => (prev?.status !== 'arrived' ? activeRideData : prev));
          setNotification('Your driver has arrived!');
        }
      } catch (error) {
        console.error('Error polling active ride status:', error);
      }
    };
    const intervalId = setInterval(pollActiveRideStatus, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handlePreviewRide = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/rides/preview', { pickupLocation, destination });
      setRidePreview(response.data);
      setNotification('Ride preview loaded.');

      // Expecting route geometry as GeoJSON in response.data.encodedPolyline
      const geo = response.data.encodedPolyline;

      if (!geo || !geo.features || !geo.features[0] || !geo.features[0].geometry) {
        console.error('Invalid Mapbox preview route data:', geo);
        setNotification('No valid route found.');
        return;
      }

      const geoPoints = geo.features[0].geometry.coordinates.map(
        ([lng, lat]) => ({ lat, lng })
      );
      setRoute(geoPoints);
      localStorage.setItem('ridePreview', JSON.stringify(response.data));
      localStorage.setItem('route', JSON.stringify(geoPoints));
    } catch (error) {
      console.error('Error previewing ride:', error);
      setNotification('Failed to preview ride.');
    }
  };

  const handleRequestRide = async () => {
    try {
      const response = await api.post('/rides/request', { pickupLocation, destination });
      const { rideId, encodedPolyline, pickupLat, pickupLng, destinationLat, destinationLng } = response.data;
      const geoPoints = encodedPolyline.features[0].geometry.coordinates.map(
        ([lng, lat]) => ({ lat, lng })
      );
      setNotification(`Ride requested! ID: ${rideId}`);
      setActiveRide({ ...response.data, status: 'requested', rideId });
      setRoute(geoPoints);
      setRidePreview({ pickupLat, pickupLng, destinationLat, destinationLng });
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
      setNotification(`Ride canceled. Fee: £${response.data.cancellationFee || 0}`);
      setActiveRide(null);
      // Remove only ride-specific keys, not the auth token.
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
      localStorage.removeItem('activeRide');
      setRidePreview(null);
      setRoute(null);
      // Optionally, clear driver location if needed:
      setDriverLocation(null);
      const historyData = await fetchRideHistory();
      setRideHistory(historyData);
    } catch (error) {
      console.error('Error canceling ride:', error);
      setNotification('Failed to cancel ride.');
    }
  };
  
  

  const markers = [];
  if (ridePreview?.pickupLat && ridePreview?.pickupLng) {
    markers.push({ id: 'pickup', lat: ridePreview.pickupLat, lng: ridePreview.pickupLng });
  }
  if (driverLocation) markers.push(driverLocation);

  return (
    <div>
      <Navbar />
      <Notifications />
      <div className="dashboard-container" style={{ padding: '1rem' }}>
        <div className="dashboard-tabs d-flex flex-wrap justify-content-around mb-3">
          {['rideRequest', 'activeRide', 'rideHistory', 'profile', 'documents', 'chat'].map(tab => (
            <button
              key={tab}
              className={`btn btn-outline-primary ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>

        {activeTab === 'rideRequest' && (
          <>
            <RideRequest
              pickupLocation={pickupLocation}
              setPickupLocation={setPickupLocation}
              destination={destination}
              setDestination={setDestination}
              ridePreview={ridePreview}
              handlePreviewRide={handlePreviewRide}
              handleRequestRide={handleRequestRide}
            />
            <MapSection markers={markers} route={route} />
          </>
        )}

        {activeTab === 'activeRide' && (
          <>
            <ActiveRideSection activeRide={activeRide} eta={eta} handleCancelRide={handleCancelRide} />
            <MapSection markers={markers} route={route} />
          </>
        )}

        {activeTab === 'rideHistory' && (
          <RideHistory
            rideHistory={rideHistory}
            expandedRide={expandedRide}
            setExpandedRide={setExpandedRide}
            setPickupLocation={setPickupLocation}
            setDestination={setDestination}
          />
        )}

        {activeTab === 'profile' && <ProfileSection profile={profile} />}

        {activeTab === 'documents' && (
          <section className="documents-section">
            <h2>Your Documents</h2>
            <DocumentUpload documentType="profilePhoto" />
          </section>
        )}

        <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
          {activeRide ? (
            <ChatBox rideId={activeRide.rideId || activeRide.id} role="Rider" />
          ) : (
            <p>No active ride available. Request or accept a ride to start chatting.</p>
          )}
        </div>

        {notification && (
          <section className="notification-section mt-3 p-2 bg-warning">
            <p>{notification}</p>
          </section>
        )}
      </div>

      {showRideSummaryModal && rideSummary && (
        <RideSummary
          ride={rideSummary}
          onClose={() => setShowRideSummaryModal(false)}
          onProceedToRating={() => {
            setCurrentRideForRating(rideSummary);
            setShowRideSummaryModal(false);
            setShowRatingModal(true);
          }}
        />
      )}
      {showRatingModal && currentRideForRating && (
        <RatingModal
          rideId={currentRideForRating.id}
          rateeId={currentRideForRating.driver_id}
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={() => fetchRideHistory().then(setRideHistory)}
        />
      )}
    </div>
  );
};

export default RiderDashboard;
