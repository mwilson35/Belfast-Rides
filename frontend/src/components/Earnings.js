// src/components/Earnings.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getWeekStartAndEnd } from '../utils/dateUtils';
import '../styles/Earnings.css';

const Earnings = () => {
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [weekRange, setWeekRange] = useState({ formattedWeekStart: '', formattedWeekEnd: '' });

  useEffect(() => {
    // Get the current week's boundaries using your date utility.
    setWeekRange(getWeekStartAndEnd());

    const fetchCurrentEarnings = async () => {
      try {
        const res = await api.get('/driver/earnings');
        setCurrentEarnings(parseFloat(res.data.totalEarnings));
        setCurrentMessage(res.data.message);
      } catch (error) {
        console.error("Error fetching current earnings:", error);
      }
    };

    const fetchEarningsHistory = async () => {
      try {
        const res = await api.get('/driver/earnings/history');
        setHistory(res.data.history);
      } catch (error) {
        console.error("Error fetching earnings history:", error);
      }
    };

    fetchCurrentEarnings();
    fetchEarningsHistory();
  }, []);

  return (
    <div className="earnings">
      <h2>Earnings</h2>
      <div className="current-earnings">
        <h3>This Week</h3>
        <p>Date Range: {weekRange.formattedWeekStart} - {weekRange.formattedWeekEnd}</p>
        <p>{currentMessage}</p>
        <p>£{currentEarnings.toFixed(2)}</p>
      </div>
      <div className="earnings-history">
        <h3>History</h3>
        {history.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Week Start</th>
                <th>Week End</th>
                <th>Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.weekStart}</td>
                  <td>{item.weekEnd}</td>
                  <td>£{parseFloat(item.totalEarnings).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No earnings history available.</p>
        )}
      </div>
    </div>
  );
};

export default Earnings;
