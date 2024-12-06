const express = require('express'); // Import express
const app = express(); // Initialize express app
const authRoutes = require('./routes/auth'); // Import auth routes

const PORT = 3000; // Define the port

// Middleware to parse incoming JSON data
app.use(express.json());

// Debugging log to confirm server startup
console.log('Server loaded. Routes about to be registered.');

// Register authentication routes
try {
    app.use('/auth', authRoutes);
    console.log('Authentication routes registered.');
} catch (error) {
    console.error('Error loading auth routes:', error.message);
}

// Register ride management routes
try {
    console.log('Attempting to load rides.js...');
    const ridesRoutes = require('./routes/rides'); // Import ride management routes
    console.log('rides.js successfully loaded.');
    app.use('/rides', ridesRoutes);
    console.log('Ride management routes registered.');
} catch (error) {
    console.error('Error loading rides.js:', error.message);
}

// Test route to confirm server is working
app.get('/', (req, res) => {
    res.send('Welcome to Belfast Rides Backend!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
