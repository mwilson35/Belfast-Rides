const express = require('express'); // Import express
const app = express(); // Initialize express app
const authRoutes = require('./routes/auth'); // Import auth routes

const PORT = 3000; // Define the port

// Middleware to parse incoming JSON data
app.use(express.json()); 

// Test Route to confirm server is working
app.get('/', (req, res) => {
    res.send('Welcome to Belfast Rides Backend!');
});

// Registering authentication routes
console.log('Server loaded. Routes about to be registered.');
app.use('/auth', authRoutes);
console.log('Authentication routes registered.');

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
