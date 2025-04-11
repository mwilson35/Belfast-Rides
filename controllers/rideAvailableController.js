const db = require('../db');

exports.getAvailableRides = (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Forbidden: Only drivers can view available rides.' });
  }
  
  db.query('SELECT * FROM rides WHERE status = "requested"', (err, results) => {
    if (err) {
      console.error('Database error while fetching available rides:', err.message);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
};
