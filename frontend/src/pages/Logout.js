
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Logout.css';

const Logout = () => {
  useEffect(() => {
    // Clear authentication tokens from localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  return (
    <div className="logout-container">
      <div className="logout-message">
        <h1>Logged Out</h1>
        <p>You have been successfully logged out.</p>
        <p>
          {}
          <Link to="/">Click here to login.</Link>
        </p>
      </div>
    </div>
  );
};

export default Logout;
