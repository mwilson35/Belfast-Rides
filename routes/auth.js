const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Import database connection
const router = express.Router();

// User Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            console.log('Missing fields in signup:', { username, email, password });
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



//Driver Signup
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



// User Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('Login route was hit');
    console.log('Request body:', req.body);

    // Find the user in the database
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Database error during login:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            console.log('Invalid username:', username);
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const user = results[0];

        // Compare the password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log('Invalid password for username:', username);
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role, verified: user.verified }, // Includes the verified field
            'your_secret_key',
            { expiresIn: '1h' }
        );

        console.log('Login successful, token generated:', token);

        res.json({ message: 'Login successful', token });
    });
});



// Admin Account Creation (Restricted Use)
// Import authenticateToken middleware
const { authenticateToken } = require('./middleware'); // Adjust the path if needed

// Admin Account Creation (Restricted Use)
router.post('/create-admin', authenticateToken, async (req, res) => {
    const { username, email, password } = req.body;

    // Ensure only admins can create new admin accounts
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



// Export the router
module.exports = router;
