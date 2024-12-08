const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Import database connection
const router = express.Router();

// User Signup
router.post('/signup', async (req, res) => {
    const { username, password, role } = req.body;

    console.log('Signup route hit with data:', { username, role });

    // Validate role (optional: restrict to known roles)
    const validRoles = ['rider', 'driver', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into the database
        db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role],
            (err) => {
                if (err) return res.status(500).json({ message: 'Error saving user' });
                res.status(201).json({ message: 'User registered successfully!' });
            }
        );
    });
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
        const token = jwt.sign({ id: user.id, role: user.role }, 'your_secret_key', { expiresIn: '1h' });
        console.log('Login successful, token generated:', token);

        res.json({ message: 'Login successful', token });
    });
});

// Export the router
module.exports = router;
