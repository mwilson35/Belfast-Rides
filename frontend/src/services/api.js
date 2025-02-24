// src/services/api.js
import axios from 'axios';

// Create an Axios instance with the base URL of your backend
const api = axios.create({
  baseURL: 'http://localhost:5000',
});


// Attach the JWT token from localStorage to every request if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
