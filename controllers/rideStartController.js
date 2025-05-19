
const db = require('../db'); 

const jwt = require('jsonwebtoken');

exports.startRide = (req, res) => {
  const { rideId } = req.body;

  
  const driverId = req.user.id;

  
  if (!rideId) {
    return res.status(400).json({ message: 'rideId is required.' });
  }

  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, results) => {
    if (err) {
      console.error("Database error fetching ride:", err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length === 0) {
      console.error("No ride found for rideId:", rideId);
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    const ride = results[0];

    
    if (ride.driver_id !== driverId) {
      console.error(`Driver ${driverId} is not assigned to ride ${rideId}`);
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this ride' });
    }
    if (ride.status !== 'accepted') {
      console.error(`Ride status is not 'accepted'. Current status: ${ride.status}`);
      return res.status(400).json({ message: 'Ride must be in accepted status to be started' });
    }
    
    db.query('UPDATE rides SET status = ? WHERE id = ?', ['in_progress', rideId], (err, updateResults) => {
      if (err) {
        console.error("Error updating ride status:", err);
        return res.status(500).json({ message: 'Database error updating ride status' });
      }
      
      const io = req.app.get('io');
      if (!io) {
        console.error("Socket.IO instance not found in req.app");
      } else {
   
        io.emit('rideInProgress', { rideId });
      }
      

      res.json({ message: 'Ride started successfully', rideId });
    });
  });
};
