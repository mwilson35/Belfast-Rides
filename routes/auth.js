const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const users = []; // Simulated database for demo purposes

// Log that auth.js is successfully loaded
console.log('auth.js loaded successfully.');

// User Signup Route
router.post('/signup', async (req, res) => {
    console.log('Signup route was hit'); // Debugging log to verify the route is being called

    const { username, password } = req.body;

    // Check if the user already exists
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user
    users.push({ username, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully!' });
});

// User Login Route
router.post('/login', async (req, res) => {
    console.log('Login route was hit'); // Debugging log for login endpoint

    const { username, password } = req.body;

    // Find the user
    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Check the password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Generate a JWT token
    const token = jwt.sign({ username }, 'your_secret_key', { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
});

module.exports = router;
