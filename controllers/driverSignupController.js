const bcrypt = require('bcryptjs');
const db = require('../db');

exports.signupDriver = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (username, email, password, role, verified) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, 'driver', false],
      (err, results) => {
        if (err) {
          console.error('Error inserting driver:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({
          message: 'Driver registered successfully. Await admin verification.'
        });
      }
    );
  } catch (error) {
    console.error('Error during driver signup:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
