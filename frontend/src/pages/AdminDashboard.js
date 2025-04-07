import React, { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';
import axios from 'axios';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    if (activeTab === 'drivers') {
      fetchDrivers();
    }
  }, [activeTab]);

  const fetchDrivers = () => {
    axios.get('http://localhost:5000/admin/drivers')
      .then(res => setDrivers(res.data))
      .catch(err => console.error('Failed to fetch drivers:', err));
  };

  const verifyDriver = (driverId, verified) => {
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/rides/verify-driver',
      { driverId, verified },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(() => fetchDrivers())
    .catch(err => console.error(`Failed to ${verified ? 'verify' : 'unverify'} driver:`, err));
  };
  

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h1>🚖 Admin Panel</h1>
        <ul>
          <li onClick={() => setActiveTab('dashboard')}>Dashboard</li>
          <li onClick={() => setActiveTab('drivers')}>Drivers</li>
        </ul>
      </aside>
      
      <main className="admin-main">
        {activeTab === 'dashboard' && (
          <>
            <h2>Welcome, Admin!</h2>
            <p>Your reign of power begins here.</p>
          </>
        )}

        {activeTab === 'drivers' && (
          <>
            <h2>Drivers</h2>
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Username</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Verified</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id}>
                    <td className="p-2 border">{driver.id}</td>
                    <td className="p-2 border">{driver.username}</td>
                    <td className="p-2 border">{driver.email}</td>
                    <td className="p-2 border">{driver.verified ? '✅' : '❌'}</td>
                    <td className="p-2 border">
  {driver.verified ? (
    <button
      onClick={() => verifyDriver(driver.id, false)}
      className="unverify-btn"
    >
      Unverify
    </button>
  ) : (
    <button
      onClick={() => verifyDriver(driver.id, true)}
      className="verify-btn"
    >
      Verify
    </button>
  )}
</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  );
}
