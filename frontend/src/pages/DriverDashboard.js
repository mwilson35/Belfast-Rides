// src/pages/DriverDashboard.js
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AvailableRidesList from '../components/AvailableRidesList';
import DriverInteractiveMap from '../components/DriverInteractiveMap';
import Earnings from '../components/Earnings';
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

const geocodeAddress = (address) =>
  new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        resolve({ lat: lat(), lng: lng() });
      } else {
        reject(`Geocode failed: ${status}`);
      }
    });
  });

const DriverDashboard = () => {
  const [availableRides, setAvailableRides] = useState([]);
  const [message, setMessage] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directions, setDirections] = useState(null);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [arrivedPingSent, setArrivedPingSent] = useState(false);
  // New state to control the active tab: "rides" or "earnings"
  const [activeTab, setActiveTab] = useState('rides');

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
    const fetchClientSideDirections = () => {
      if (driverLocation && (riderLocation || destination)) {
        const directionsService = new window.google.maps.DirectionsService();
        const origin = new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng);
        const target = riderLocation
          ? new window.google.maps.LatLng(riderLocation.lat, riderLocation.lng)
          : new window.google.maps.LatLng(destination.lat, destination.lng);
        directionsService.route(
          {
            origin: origin,
            destination: target,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK || status === 'OK') {
              setDirections(result);
            } else {
              console.error('Error fetching directions:', result);
            }
          }
        );
      }
    };
    fetchClientSideDirections();
    intervalId = setInterval(fetchClientSideDirections, 30000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [driverLocation, riderLocation, destination]);

  const handleAcceptRide = async (rideId) => {
    try {
      await api.post('/rides/accept', { rideId });
      setMessage(`Ride ${rideId} accepted!`);
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
      console.error('Error accepting ride:', err);
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
            autoFit={true}
            directions={directions}
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
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
