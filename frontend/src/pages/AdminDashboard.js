import React, { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';
import axios from 'axios';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);

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

  useEffect(() => {
    if (activeTab === 'rides') {
      const token = localStorage.getItem('token');
      axios.get('http://localhost:5000/admin/rides', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('RIDES FROM BACKEND:', res.data);
          setRides(res.data);
        })
        .catch(err => console.error('Failed to fetch rides:', err));
    }
  }, [activeTab]);

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h1>🚖 Admin Panel</h1>
        <ul>
          <li onClick={() => setActiveTab('dashboard')}>Dashboard</li>
          <li onClick={() => setActiveTab('drivers')}>Drivers</li>
          <li onClick={() => setActiveTab('rides')}>Rides</li>
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
                        <button onClick={() => verifyDriver(driver.id, false)} className="unverify-btn">Unverify</button>
                      ) : (
                        <button onClick={() => verifyDriver(driver.id, true)} className="verify-btn">Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'rides' && (
          <>
            <h2>Rides</h2>
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Pickup</th>
                  <th className="p-2 border">Destination</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Driver</th>
                  <th className="p-2 border">Rider ID</th>
                  <th className="p-2 border">Requested</th>
                  <th className="p-2 border">Completed</th>
                  <th className="p-2 border">Fare</th>
                  <th className="p-2 border">Est. Fare</th>
                  <th className="p-2 border">Tip</th>
                  <th className="p-2 border">Surge</th>
                  <th className="p-2 border">Distance</th>
                </tr>
              </thead>
              <tbody>
                {rides.map(ride => (
                  <tr key={ride.id}>
                    <td className="p-2 border">{ride.id}</td>
                    <td className="p-2 border">{ride.pickup_location}</td>
                    <td className="p-2 border">{ride.destination}</td>
                    <td className="p-2 border">{ride.status}</td>
                    <td className="p-2 border">{ride.driver_name || 'Unassigned'}</td>
                    <td className="p-2 border">{ride.rider_id}</td>
                    <td className="p-2 border">{ride.requested_at || '—'}</td>
                    <td className="p-2 border">{ride.completed_at || '—'}</td>
                    <td className="p-2 border">£{Number(ride.fare).toFixed(2)}</td>
<td className="p-2 border">£{Number(ride.estimated_fare).toFixed(2)}</td>
<td className="p-2 border">£{Number(ride.tip).toFixed(2)}</td>

                    <td className="p-2 border">{ride.surge_multiplier || '1x'}</td>
                    <td className="p-2 border">{ride.distance ? `${ride.distance} km` : '—'}</td>
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
