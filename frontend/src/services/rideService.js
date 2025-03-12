// src/services/rideService.js
import api from './api';

export const fetchRideHistory = async () => {
  try {
    const response = await api.get('/rides/history');
    return response.data;
  } catch (error) {
    console.error('Error fetching ride history:', error);
    throw error;
  }
};

export const fetchProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const fetchActiveRide = async () => {
  try {
    const response = await api.get('/rides/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active ride:', error);
    throw error;
  }
};

export const fetchAcceptedRideDetails = async (rideId) => {
  try {
    const response = await api.get('/rides/accepted-ride-details', { params: { rideId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching accepted ride details:', error);
    throw error;
  }
};

export const fetchRouteData = async (origin, destination) => {
  try {
    const response = await api.get('/get-directions', { params: { origin, destination } });
    return response.data;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
};
