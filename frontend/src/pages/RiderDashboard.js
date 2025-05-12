import '../styles/Dashboard.css';
import React, { useState, useEffect, useRef } from 'react';
import polyline from '@mapbox/polyline';
import { LoadScript } from '@react-google-maps/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useCallback } from 'react';
import DocumentUpload from '../components/DocumentUpload';
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
  fetchAcceptedRideDetails
} from '../services/rideService';

const RiderDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [ridePreview, setRidePreview] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  
  const [notification, setNotification] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRideForRating, setCurrentRideForRating] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [expandedRide, setExpandedRide] = useState(null);
  const [rideSummary, setRideSummary] = useState(null);
  const [showRideSummaryModal, setShowRideSummaryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('rideRequest');
  const [previewRoute, setPreviewRoute] = useState(null); 
const [activeRoute, setActiveRoute] = useState(null);   


  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const activeRideRef = useRef(activeRide);
  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);

  const socketRef = useRef(null);
  useEffect(() => {
    localStorage.removeItem('activeRide'); // clear stale junk on first load
  }, []);
  
  useEffect(() => {
    const storedActiveRoute = localStorage.getItem('activeRoute');
    if (storedActiveRoute) {
      setActiveRoute(JSON.parse(storedActiveRoute));
    }
  }, []);
  

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
    if (storedRoute) setPreviewRoute(JSON.parse(storedRoute));
  }, []);
  

  useEffect(() => {
    const loadData = async () => {
      try {
        const historyData = await fetchRideHistory();
        setRideHistory(historyData);
      } catch { notify('Failed to load ride history.'); }

      try {
        const profileData = await fetchProfile();
        setProfile(profileData);
      } catch { notify('Failed to load profile.'); }

      try {
        const activeRideData = await fetchActiveRide();
        if (!activeRideData) {
          localStorage.removeItem('ridePreview');
          localStorage.removeItem('route');
          setRidePreview(null);
          
          setActiveRide(null);
          return;
        }
        if (activeRideData.status === 'accepted') {
          try {
            const enriched = await fetchAcceptedRideDetails(activeRideData.id);
            setActiveRide(prev => ({ ...prev, ...enriched }));

            localStorage.setItem('activeRide', JSON.stringify(enriched));
          } catch {
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

  const handleClearPreview = useCallback(() => {
    setRidePreview(null);
    setPreviewRoute(null); // 👈 This is the new sheriff in town
    setPickupLocation('');
    setDestination('');
    localStorage.removeItem('ridePreview');
    localStorage.removeItem('route'); // Optional now unless you're persisting previewRoute
    notify('Ride preview cleared.');
  }, []);
  
  
  
  
  // Socket setup using socketRef
  useEffect(() => {
    socketRef.current = require('socket.io-client')('http://192.168.33.3:5000', {
  withCredentials: true
});

    
    socketRef.current.on('locationUpdate', (data) => {
      console.log('Raw driver location update:', data);
        // Don't process location updates if no active ride or ride not accepted yet
  const ride = activeRideRef.current;
  if (!ride || ride.status === 'requested') {
    console.log('Ignoring driver location update: no accepted ride yet.');
    return;
  }

    
      const lat = parseFloat(data.lat);
      const lng = parseFloat(data.lng);
    
      if (!isNaN(lat) && !isNaN(lng)) {
        const coords = { id: 'driver', lat, lng };
        console.log('Setting driver location:', coords);
        setDriverLocation(coords);
        localStorage.setItem('driverLocation', JSON.stringify(coords));
      } else {
        console.warn('Ignored bad driver location:', data);
      }
    });
    
  
    socketRef.current.on('driverAccepted', async (data) => {
      notify('Your ride has been accepted!');
      try {
        const rideId =
          data.rideId ||
          (activeRideRef.current && (activeRideRef.current.rideId || activeRideRef.current.id));
        if (!rideId) return;
        const response = await api.get('/rides/accepted-ride-details', { params: { rideId } });
        console.log("Accepted ride details response:", response.data);

        setActiveRide(response.data);
localStorage.setItem('activeRide', JSON.stringify(response.data)); // just overwrite clean

      } catch (error) {
        setActiveRide((prev) => (prev ? { ...prev, status: 'accepted' } : prev));
      }
    });
  
    socketRef.current.on('driverArrived', () => {
      notify('Your driver has arrived!');

      setActiveRide((prev) => (prev ? { ...prev, status: 'arrived' } : prev));
    });
  
    socketRef.current.on('rideInProgress', () => {
      notify('Your ride is now in progress!');
      setActiveRide((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
    });
  
    socketRef.current.on('rideCompleted', async (data) => {
      console.log('[SOCKET] Received rideCompleted payload:', data);
    
      notify('Your ride is complete!');
    
      try {
        const rideId = data.rideId || (activeRideRef.current?.id ?? activeRideRef.current?.rideId);
        if (!rideId) throw new Error('Missing ride ID');
    
        setRideSummary({
          ...data,
          id: data.rideId || data.id, // Normalize so the modal doesn't throw a hissy fit
        });
      } catch (err) {
        console.warn('Could not fetch completed ride summary. Falling back.');
        const fallback = activeRideRef.current || data || {};
        setRideSummary({
          ...fallback,
          id: fallback.rideId || fallback.id || null,
        });
      }
    
      setShowRideSummaryModal(true);
    
      setTimeout(() => {
        setActiveRide(null);
        setActiveRoute(null);
        setRidePreview(null);
        setDriverLocation(null);
        setEta(null);
    
        localStorage.removeItem('driverLocation');
        localStorage.removeItem('activeRoute');
        localStorage.removeItem('ridePreview');
    
        fetchRideHistory().then(setRideHistory).catch(() =>
          notify('Failed to load ride history.')
        );
      }, 500);
    });
    
    
    
    
    
    
  
    // Listener for ride cancellation:
// Listener for ride cancellation:
socketRef.current.on('rideCancelled', (data) => {
  console.log('rideCancelled event received:', data);
  const cancelledBy = data.cancelledBy || 'driver';
  notify(`Your ride has been cancelled by the ${cancelledBy}.`);
  setActiveRide(null);
  setActiveRoute(null);  // Clear active route state
  setDriverLocation(null);  // Remove driver marker
  setEta(null);  // Clear ETA data
  handleClearPreview();

  localStorage.removeItem('activeRoute');
  localStorage.removeItem('driverLocation');
  localStorage.removeItem('activeRide');
});

    
    
    
    
    
  
    const storedDriverLocation = localStorage.getItem('driverLocation');
    if (storedDriverLocation) setDriverLocation(JSON.parse(storedDriverLocation));
  
    return () => socketRef.current.disconnect();
  }, [handleClearPreview]);



  useEffect(() => {
    let intervalId;
  
    if (
      activeRide &&
      driverLocation &&
      ['accepted', 'arrived', 'in_progress'].includes(activeRide.status)
    ) {
      let origin, destCoords, destinationLabel;
  
      if (activeRide.status === 'in_progress') {
        // ETA to destination
        origin = `${driverLocation.lat},${driverLocation.lng}`;
        destCoords = `${parseFloat(activeRide.destinationLat)},${parseFloat(activeRide.destinationLng)}`;
        destinationLabel = 'destination';
      } else {
        // ETA to pickup
        origin = `${driverLocation.lat},${driverLocation.lng}`;
        destCoords = `${parseFloat(activeRide.pickupLat)},${parseFloat(activeRide.pickupLng)}`;
        destinationLabel = 'pickup';
      }
  
      intervalId = setInterval(async () => {
        try {
          console.log(`ETA update (${destinationLabel}):`, {
            origin,
            destination: destCoords,
            rideStatus: activeRide.status,
          });
  
          const response = await api.get('/get-directions', {
            params: { origin, destination: destCoords },
          });
  
          const duration = response.data.routes[0].legs[0].duration.text;
          setEta(duration);
        } catch (error) {
          console.error('Error fetching ETA:', error);
        }
      }, 5000);
    }
  
    return () => intervalId && clearInterval(intervalId);
  }, [activeRide, driverLocation]);
  
  
  
  
  

  useEffect(() => {
    const pollActiveRideStatus = async () => {
      try {
        const activeRideData = await fetchActiveRide();
        if (!activeRideData) return;
        const currentRide = activeRideRef.current || {};
  
        // Always merge driver details if present in current state but missing in the new API response.
        if (currentRide.driver_id && !activeRideData.driver_id) {
          activeRideData.driver_id = currentRide.driver_id;
          activeRideData.driverName = currentRide.driverName;
          activeRideData.driverPhone = currentRide.driverPhone;
          // Merge any additional driver fields as needed.
        }
  
        // If status changed to 'arrived', notify.
        if (activeRideData.status === 'arrived' && currentRide.status !== 'arrived') {
          notify('Your driver has arrived!');
        }
  
        setActiveRide(prev => {
          const serverStatus = activeRideData.status;
          const localStatus = prev?.status;
        
          const isLocallyAhead = ['arrived', 'in_progress', 'completed'].includes(localStatus);
          const isServerBehind = ['accepted', 'requested'].includes(serverStatus);
        
          const resolvedStatus =
            isLocallyAhead && isServerBehind ? localStatus : serverStatus;
        
          return {
            ...prev,
            ...activeRideData,
            status: resolvedStatus,
          };
        });
        
        
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
      notify('Ride preview loaded.');
  
      const encodedPolyline = response.data.encodedPolyline;
  
      if (!encodedPolyline) {
        notify('No valid route found.');
        return;
      }
  
      // Unify decoding: assume polyline.decode returns [lat, lng]
      const decodedPath = polyline.decode(encodedPolyline).map(
        ([lat, lng]) => ({ lat, lng })
      );
      console.log("Preview decodedPath:", decodedPath);  // Debug log
  
      setPreviewRoute(decodedPath);
      localStorage.setItem('ridePreview', JSON.stringify(response.data));
      localStorage.setItem('route', JSON.stringify(decodedPath));
    } catch (error) {
      console.error('Error previewing ride:', error);
      notify('Failed to preview ride.');
    }
  };
  
  const handleRequestRide = async () => {
    try {
      const response = await api.post('/rides/request', { pickupLocation, destination });
      const { rideId, encodedPolyline } = response.data;
      
      // Try decoding the polyline from the active ride response.
      let decodedPath = [];
      if (encodedPolyline) {
        decodedPath = polyline.decode(encodedPolyline).map(
          ([lat, lng]) => ({ lat, lng })
        );
      }
      // If decoding yields an empty array, fallback to the preview route stored in localStorage.
      if (!decodedPath.length) {
        const storedRoute = localStorage.getItem('route');
        if (storedRoute) {
          decodedPath = JSON.parse(storedRoute);
        }
      }
      
      console.log("Active ride decodedPath:", decodedPath);  // Expect to see 28 points
      
      if (!decodedPath.length) {
        notify('No valid route found for active ride.');
        return;
      }
      
      notify(`Ride requested! ID: ${rideId}`);
      setActiveRide({ ...response.data, status: 'requested', rideId });
      setActiveRoute(decodedPath);
      
      // Clear preview values so they don't interfere.
      setPreviewRoute(null);
      setRidePreview(null);
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
    } catch (error) {
      console.error('Error requesting ride:', error);
      notify('Failed to request ride.');
    }
  };
  
  
  
  
  
  

  const handleCancelRide = async () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this ride? A cancellation fee may apply.");
    if (!confirmCancel) return;
    try {
      const response = await api.post('/rides/cancel', { rideId: activeRide.rideId || activeRide.id });
      notify(`Ride canceled. Fee: £${response.data.cancellationFee || 0}`);
      // Clear active ride data
      setActiveRide(null);
      setActiveRoute(null); // <== Add this to clear the active route state
      // Clear any preview/active keys from localStorage
      localStorage.removeItem('ridePreview');
      localStorage.removeItem('route');
      localStorage.removeItem('activeRide');
      localStorage.removeItem('activeRoute');
      setRidePreview(null);
      setDriverLocation(null);
localStorage.removeItem('driverLocation');

      const historyData = await fetchRideHistory();
      setRideHistory(historyData);
    } catch (error) {
      console.error('Error canceling ride:', error);
      notify('Failed to cancel ride.');
    }
  };
  
  
  
  

  const markers = [];

  const rideHasDriver =
    activeRide &&
    ['accepted', 'arrived', 'in_progress', 'completed'].includes(activeRide.status);
  
  if (!ridePreview && rideHasDriver && driverLocation) {
    markers.push({ id: 'driver', ...driverLocation });
  }
  
  if (ridePreview) {
    if (ridePreview?.pickupLat && ridePreview?.pickupLng) {
      markers.push({ id: 'pickup', lat: ridePreview.pickupLat, lng: ridePreview.pickupLng });
    }
    if (ridePreview?.destinationLat && ridePreview?.destinationLng) {
      markers.push({ id: 'dropoff', lat: ridePreview.destinationLat, lng: ridePreview.destinationLng });
    }
  } else if (activeRide && activeRoute?.length) {
    const [firstPoint] = activeRoute;
    const lastPoint = activeRoute[activeRoute.length - 1];
  
    markers.push({ id: 'pickup', lat: firstPoint.lat, lng: firstPoint.lng });
    markers.push({ id: 'dropoff', lat: lastPoint.lat, lng: lastPoint.lng });
  }
  
  
  
  
  
  
  const TAB_LABELS = {
    rideRequest: 'Request a Ride',
    activeRide: 'Your Current Ride',
    rideHistory: 'Ride History',
    profile: 'Your Profile',
    documents: 'Documents',
    chat: 'Chat'
  };

  return (
    <div>
      <Navbar />

      <div className="dashboard-container" style={{ padding: '1rem' }}>
      <div className="dashboard-tabs d-flex flex-wrap justify-content-around mb-3">
  {Object.entries(TAB_LABELS).map(([key, label]) => (
    <button
      key={key}
      className={`btn btn-outline-primary ${activeTab === key ? 'active' : ''}`}
      onClick={() => setActiveTab(key)}
    >
      {label}
    </button>
  ))}
</div>


        <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
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
      <MapSection key={`preview-${previewRoute?.length || 0}`} markers={markers} route={previewRoute} />


      {ridePreview && (
        <div className="mt-2 d-flex justify-content-end">
          <button
            className="btn btn-outline-danger"
            onClick={handleClearPreview}
          >
            Clear Preview
          </button>
        </div>
      )}
    </>
  )}

  {activeTab === 'activeRide' && (
    <>
      <ActiveRideSection
        activeRide={activeRide}
        eta={eta}
        handleCancelRide={handleCancelRide}
      />
<MapSection
  key={`active-${activeRoute ? activeRoute.length : 0}`}
  markers={markers}
  route={activeRoute}
  center={activeRoute && activeRoute[0] ? activeRoute[0] : { lat: 54.5973, lng: -5.9301 }}
/>



    </>
  )}
</LoadScript>


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
  <section className="notification-section mt-3 p-2 bg-warning" style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
    <p>{notification}</p>
  </section>
)}

      </div>

      {showRideSummaryModal && rideSummary && (
        <RideSummary
          ride={rideSummary}
          onClose={() => setShowRideSummaryModal(false)}
          onProceedToRating={() => {
            console.log('[DEBUG] Ride summary before rating:', rideSummary);
            if (!rideSummary?.id || !rideSummary?.driver_id) {
              alert("Ride data is incomplete. Cannot proceed to rating.");
              return;
            }
          
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
