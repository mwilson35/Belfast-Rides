import '../styles/Dashboard.css';
import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DocumentUpload from '../components/DocumentUpload';
import Notifications from '../components/Notifications';
import RatingModal from '../components/RatingModal';
import ChatBox from '../components/ChatBox';
import polyline from 'polyline';
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

const decodePolyline = (encoded) => {
  const points = polyline.decode(encoded);
  return points.map((point) => ({ lat: point[0], lng: point[1] }));
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
  const [activeTab, setActiveTab] = useState('rideRequest');

  // Create a ref to hold the latest activeRide value.
  const activeRideRef = useRef(activeRide);
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // Remove persisted preview/route on mount if no active ride exists
  useEffect(() => {
    const storedActiveRide = localStorage.getItem('activeRide');
    if (!storedActiveRide) {
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
    }
  }, []);

  // Load persisted preview and route
  useEffect(() => {
    const storedPreview = localStorage.getItem('ridePreview');
    const storedRoute = localStorage.getItem('route');
    if (storedPreview) setRidePreview(JSON.parse(storedPreview));
    if (storedRoute) setRoute(JSON.parse(storedRoute));
  }, []);

  // Load initial data using service functions
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

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const socket = require('socket.io-client')('http://localhost:5000');

    socket.on('locationUpdate', (data) => {
      setDriverLocation({ id: 'driver', lat: data.lat, lng: data.lng });
      localStorage.setItem('driverLocation', JSON.stringify({ lat: data.lat, lng: data.lng }));
    });

    socket.on('driverAccepted', async (data) => {
      setNotification('Your ride has been accepted!');
      try {
        const rideId = data.rideId || (activeRideRef.current && (activeRideRef.current.rideId || activeRideRef.current.id));
        if (!rideId) return;
        const response = await api.get('/rides/accepted-ride-details', { params: { rideId } });
        setActiveRide(response.data);
      } catch (error) {
        setActiveRide(prev => prev ? { ...prev, status: 'accepted' } : prev);
      }
    });

    socket.on('driverArrived', () => {
      console.log('Rider dashboard received driverArrived event');
      setNotification('Your driver has arrived!');
      setActiveRide(prev => prev ? { ...prev, status: 'arrived' } : prev);
    });
    
    
    

    socket.on('rideInProgress', () => {
      setNotification('Your ride is now in progress!');
      setActiveRide(prev => prev ? { ...prev, status: 'in progress' } : prev);
    });

    socket.on('rideCompleted', (data) => {
      setNotification('Your ride is complete!');
      const rideDetails = activeRideRef.current
        ? { ...activeRideRef.current }
        : { 
            id: data.rideId, 
            driver_id: data.driver_id, 
            pickup_location: data.pickup_location,
            destination: data.destination,
            created_at: data.created_at,
            distance: data.distance,
            fare: data.fare,
            estimated_fare: data.estimated_fare,
          };
      setRideSummary(rideDetails);
      setShowRideSummaryModal(true);
      setTimeout(() => {
        setActiveRide(null);
        fetchRideHistory()
          .then(setRideHistory)
          .catch(() => setNotification('Failed to load ride history.'));
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
              destination: destination,
            },
          });
          const duration = response.data.routes[0].legs[0].duration.text;
          setEta(duration);
        } catch (error) {
          console.error('Error fetching ETA:', error);
        }
      }, 30000);
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
      const data = await fetchRouteData(pickupLocation, destination);
      const encodedPolyline = data.routes[0].overview_polyline.points;
      setRoute(decodePolyline(encodedPolyline));
    } catch (error) {
      console.error('Error previewing ride:', error);
      setNotification('Failed to preview ride.');
    }
  };

  const handleRequestRide = async () => {
    try {
      const response = await api.post('/rides/request', { pickupLocation, destination, encodedPolyline: ridePreview.encodedPolyline });
      setNotification(`Ride requested successfully! Ride ID: ${response.data.rideId || response.data.id}`);
      setRidePreview(null);
      setActiveRide({ ...response.data, status: response.data.status || 'requested' });
      const historyData = await fetchRideHistory();
      setRideHistory(historyData);
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
      const historyData = await fetchRideHistory();
      setRideHistory(historyData);
    } catch (error) {
      console.error('Error canceling ride:', error);
      setNotification('Failed to cancel ride.');
    }
  };

  // Prepare markers for MapSection if applicable
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
      <div className="dashboard-container" style={{ padding: '1rem' }}>
        {/* Mobile-friendly tab navigation */}
        <div className="dashboard-tabs d-flex flex-wrap justify-content-around mb-3">
          <button className={`btn btn-outline-primary ${activeTab === 'rideRequest' ? 'active' : ''}`} onClick={() => setActiveTab('rideRequest')}>
            Request Ride
          </button>
          <button className={`btn btn-outline-primary ${activeTab === 'activeRide' ? 'active' : ''}`} onClick={() => setActiveTab('activeRide')}>
            Active Ride
          </button>
          <button className={`btn btn-outline-primary ${activeTab === 'rideHistory' ? 'active' : ''}`} onClick={() => setActiveTab('rideHistory')}>
            Ride History
          </button>
          <button className={`btn btn-outline-primary ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            Profile
          </button>
          <button className={`btn btn-outline-primary ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
            Documents
          </button>
          <button className={`btn btn-outline-primary ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            Chat
          </button>
        </div>

        {/* Render content based on active tab */}
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
            <ActiveRideSection 
              activeRide={activeRide} 
              eta={eta} 
              handleCancelRide={handleCancelRide} 
            />
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

        {activeTab === 'profile' && (
          <ProfileSection profile={profile} />
        )}

        {activeTab === 'documents' && (
          <section className="documents-section">
            <h2>Your Documents</h2>
            <DocumentUpload documentType="profilePhoto" />
          </section>
        )}

        {activeTab === 'chat' && (
          <section className="chat-section mt-3">
            <h2>Chat</h2>
            <ChatBox />
          </section>
        )}

        {notification && (
          <section className="notification-section mt-3 p-2 bg-warning">
            <p>{notification}</p>
          </section>
        )}
      </div>

      {/* Ride Summary and Rating Modals */}
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
