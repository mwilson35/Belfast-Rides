// src/services/api.js
import axios from 'axios';

// Create an Axios instance with the base URL of your backend
const api = axios.create({
  baseURL: 'http://192.168.33.3:5000',
});

// Request interceptor to attach the access token
api.interceptors.request.use(
  (config) => {
    // Retrieve the access token from localStorage
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,  // If the response is successful, simply return it
  async (error) => {
    const originalRequest = error.config;
    // Check if the error response is 401 and that this request hasn't been retried already
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Attempt to get a new access token using the refresh token
          const { data } = await axios.post('http://192.168.33.3:5000/refresh-token', { refreshToken });
          const { accessToken } = data;
          // Update the access token in localStorage
          localStorage.setItem('accessToken', accessToken);
          // Set the new token in the Authorization header and retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh token is invalid or expired, handle logout or redirection here
          console.error('Refresh token error:', refreshError);
          // Optionally, clear tokens and redirect the user to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
