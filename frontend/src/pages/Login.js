// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import '../styles/Login.css'; // Import your CSS file without background

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setMessage('Login successful!');
      const decoded = jwtDecode(accessToken);
      console.log("Decoded token:", decoded);
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
    // Apply the background as an inline style using process.env.PUBLIC_URL
    <div
      className="login-container"
      style={{
        background: `url(${process.env.PUBLIC_URL}/images/belfastrides.jpg) no-repeat center center fixed`,
        backgroundSize: 'cover',
      }}
    >
      <div className="login-form">
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
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default Login;
