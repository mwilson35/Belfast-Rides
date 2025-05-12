// src/components/Navbar.js
import React, { useState, useEffect } from 'react';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) setMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(90deg, #004e92, #000428)',
    padding: '0.5rem 2rem',
    color: '#fff',
  };

  const brandStyle = { fontSize: '1.5rem', fontWeight: 'bold' };
  const linkStyle = { textDecoration: 'none', color: '#fff', transition: 'color 0.3s' };
  const navLinksStyle = {
    listStyle: 'none',
    display: windowWidth > 768 ? 'flex' : 'block',
    gap: '1.5rem',
    margin: 0,
    padding: 0,
  };
  const navLinkItemStyle = {
    padding: windowWidth > 768 ? '0' : '1rem',
    textAlign: 'center',
  };
  const toggleStyle = {
    display: windowWidth > 768 ? 'none' : 'block',
    cursor: 'pointer',
  };
  const barStyle = { height: '3px', width: '25px', backgroundColor: '#fff', margin: '4px 0' };
  const logoutStyle = {
    ...linkStyle,
    border: '1px solid #fff',
    padding: '0.3rem 0.8rem',
    borderRadius: '4px',
  };

  return (
    <nav style={navStyle}>
<div style={brandStyle}>
  Belfast Rides
</div>

      <div style={toggleStyle} onClick={() => setMenuOpen(!menuOpen)}>
        <div style={barStyle}></div>
        <div style={barStyle}></div>
        <div style={barStyle}></div>
      </div>
      {(windowWidth > 768 || menuOpen) && (
        <ul style={navLinksStyle}>
          <li style={navLinkItemStyle}>
            <a href="/logout" style={logoutStyle}>
              Logout
            </a>
          </li>
        </ul>
      )}
    </nav>
  );
};

export default Navbar;
