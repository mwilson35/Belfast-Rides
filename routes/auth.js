const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('./middleware'); // Adjust the path as needed

const router = express.Router();


//        User Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
     
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'rider'],
      (err, results) => {
        if (err) {
          console.error('Error during user insertion:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ message: 'Signup successful', userId: results.insertId });
      }
    );
  } catch (error) {
    console.error('Unexpected error during signup:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//       Driver Signup
router.post('/driver-signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'driver'], // Role set as "driver"
      (err, results) => {
        if (err) {
          console.error('Database error during driver signup:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ message: 'Driver signup successful', userId: results.insertId });
      }
    );
  } catch (error) {
    console.error('Error during driver signup:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//           User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;



  // Find the user in the database
  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('Database error during login:', err.message);
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length === 0) {

      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const user = results[0];

    // Compare the password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {

      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const payload = { id: user.id, role: user.role, verified: user.verified };

    // Generate a short-lived access token 15 minutes
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '15m' }
    );

    // Generate a long-lived refresh token (e.g., 7 days)
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

   

    res.json({ message: 'Login successful', accessToken, refreshToken });
  });
});


//        Refresh Token Endpoint

router.post('/refresh-token', (req, res) => {
  // Expect the refresh token in the request body.
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided.' });
  }

  // Verify the refresh token using the same secret.
  jwt.verify(refreshToken, process.env.JWT_SECRET || 'your_secret_key', (err, decoded) => {
    if (err) {
     
      return res.status(403).json({ message: 'Invalid refresh token. Please log in again.' });
    }

    // Issue a new access token using the payload from the refresh token.
    const payload = { id: decoded.id, role: decoded.role, verified: decoded.verified };
    const newAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '15m' }
    );

    
    res.json({ accessToken: newAccessToken });
  });
});


//      Admin Account Creation
router.post('/create-admin', authenticateToken, async (req, res) => {
  const { username, email, password } = req.body;

  // Only allow admin users to create new admin accounts.
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access only.' });
  }

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'admin'],
      (err, results) => {
        if (err) {
          console.error('Database error during admin creation:', err.message);
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ message: 'Admin account created successfully', userId: results.insertId });
      }
    );
  } catch (error) {
    console.error('Error during admin creation:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
