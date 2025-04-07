const db = require('../db');

exports.getAllDrivers = (req, res) => {
  const query = 'SELECT id, username, email, verified FROM users WHERE role = "driver"';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching drivers:', err.message);
      return res.status(500).json({ message: 'Error fetching drivers' });
    }
    res.json(results);
  });
};
