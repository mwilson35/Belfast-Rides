// frontend/src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';
import axios from 'axios';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchInput, setSearchInput] = useState('');


  useEffect(() => {
    if (activeTab === 'drivers') fetchDrivers();
    if (activeTab === 'documents') fetchDocuments();
  }, [activeTab]);

  const fetchDrivers = () => {
    axios.get('http://localhost:5000/admin/drivers')
      .then(res => setDrivers(res.data))
      .catch(err => console.error('Failed to fetch drivers:', err));
  };

  const fetchDocuments = () => {
    axios.get('http://localhost:5000/admin/user-documents')
      .then(res => setDocuments(res.data))
      .catch(err => console.error('Failed to fetch documents:', err));
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

  const handleAssignDriver = (rideId, driverId) => {
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/admin/rides/assign', { rideId, driverId }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      console.log(`Assigned driver ${driverId} to ride ${rideId}`);
      setActiveTab(''); setActiveTab('manageRides');
    })
    .catch(err => console.error('Failed to assign driver:', err));
  };

  const handleCancelRide = (rideId) => {
    const token = localStorage.getItem('token');
    axios.post('http://localhost:5000/admin/rides/cancel', { rideId }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      console.log(`Cancelled ride ${rideId}`);
      setActiveTab(''); setActiveTab('manageRides');
    })
    .catch(err => console.error('Failed to cancel ride:', err));
  };

  useEffect(() => {
    if (activeTab === 'rides') {
      const token = localStorage.getItem('token');
      axios.get('http://localhost:5000/admin/rides', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setRides(res.data))
        .catch(err => console.error('Failed to fetch rides:', err));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'manageRides') {
      const token = localStorage.getItem('token');
  
      axios.get('http://localhost:5000/admin/rides', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setRides(res.data))
      .catch(err => console.error('Failed to fetch rides:', err));
  
      axios.get('http://localhost:5000/admin/drivers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setDrivers(res.data))
      .catch(err => console.error('Failed to fetch drivers:', err));
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
          <li onClick={() => setActiveTab('manageRides')}>Manage Rides</li>
          <li onClick={() => setActiveTab('documents')}>User Documents</li>
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

        {activeTab === 'manageRides' && (
          <>
            <h2>Manage Rides</h2>
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="p-2 border">Ride ID</th>
                  <th className="p-2 border">Pickup</th>
                  <th className="p-2 border">Destination</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Assigned Driver</th>
                  <th className="p-2 border">Assign</th>
                  <th className="p-2 border">Cancel</th>
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
                    <td className="p-2 border">
                      <select
                        onChange={e => handleAssignDriver(ride.id, e.target.value)}
                        defaultValue=""
                        className="border p-1"
                      >
                        <option value="" disabled>Choose driver</option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.username}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border">
                      <button onClick={() => handleCancelRide(ride.id)} className="cancel-btn">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

{activeTab === 'documents' && (
  <>
    <h2>User Documents</h2>

    <input
      type="text"
      placeholder="Search by username, email, or user ID"
      onChange={(e) => setSearchInput(e.target.value)}
      className="mb-3 p-2 border rounded w-full max-w-sm"
    />

    <table className="min-w-full border text-sm">
      <thead>
        <tr>
          <th className="p-2 border">ID</th>
          <th className="p-2 border">User</th>
          <th className="p-2 border">Email</th>
          <th className="p-2 border">Type</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">File</th>
          <th className="p-2 border">Uploaded</th>
        </tr>
      </thead>
      <tbody>
        {[...documents]
          .filter(doc => {
            const input = searchInput.toLowerCase();
            return (
              doc.username?.toLowerCase().includes(input) ||
              doc.email?.toLowerCase().includes(input) ||
              doc.user_id?.toString().includes(input)
            );
          })
          .sort((a, b) => b.id - a.id)
          .map(doc => (
            <tr key={doc.id}>
              <td className="p-2 border">{doc.id}</td>
              <td className="p-2 border">{doc.username}</td>
              <td className="p-2 border">{doc.email}</td>
              <td className="p-2 border">{doc.document_type}</td>
              <td className="p-2 border">{doc.status}</td>
              <td className="p-2 border">
                <a
                  href={`http://localhost:5000/${doc.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </td>
              <td className="p-2 border">
                {doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleString()
                  : '—'}
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
