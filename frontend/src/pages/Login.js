// src/pages/Login.js
import React, { useState } from 'react';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      setMessage('Login successful!');
      // Redirect based on user role; for example, assume rider:
      window.location.href = '/rider-dashboard';
    } catch (error) {
      console.error(error);
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
