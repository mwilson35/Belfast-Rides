const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Import database connection
const router = express.Router();

// User Signup
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    // Log incoming data
    console.log('Signup route was hit');
    console.log('Request body:', req.body);

    console.log('Checking if user exists...');
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Error checking for user:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            console.log('User already exists:', username);
            return res.status(400).json({ message: 'User already exists' });
        }

        console.log('User does not exist, hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Saving user to database...');
        db.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            (err) => {
                if (err) {
                    console.error('Error inserting user:', err.message);
                    return res.status(500).json({ message: 'Error saving user' });
                }
                console.log('User registered successfully:', username);
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
