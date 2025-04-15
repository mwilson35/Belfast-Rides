// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      // Expecting the backend to return both accessToken and refreshToken
      const { accessToken, refreshToken } = response.data;
      
      // Store tokens in localStorage (or consider a secure alternative)
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setMessage('Login successful!');
      
      // Decode the access token to extract the role info
      const decoded = jwtDecode(accessToken);
      console.log("Decoded token:", decoded);
      
      // Navigate the user based on their role
      if (decoded.role === 'driver') {
        navigate('/driver-dashboard');
      } else if (decoded.role === 'rider') {
        navigate('/rider-dashboard');
      } else if (decoded.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error("Login failed:", error);
      setMessage('Login failed.');
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Login;
