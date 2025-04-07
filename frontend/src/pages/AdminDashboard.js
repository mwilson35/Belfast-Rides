import React from 'react';
import '../styles/AdminDashboard.css';


export default function AdminDashboard() {
  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h1>🚖 Admin Panel</h1>
        <ul>
          <li>Dashboard</li>
          <li>Drivers (soon)</li>
        </ul>
      </aside>
      <main className="admin-main">
        <h2>Welcome, Admin!</h2>
        <p>Your reign of power begins here.</p>
      </main>
    </div>
  );
}
