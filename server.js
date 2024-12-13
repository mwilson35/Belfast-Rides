const express = require('express'); // Import express
const app = express(); // Initialize express app
require('dotenv').config();
const axios = require('axios');
const authRoutes = require('./routes/auth'); // Import auth routes
const ridesRoutes = require('./routes/rides'); // Import ride management routes
const db = require('./db'); // Import database connection

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
console.log("Google Maps API Key:", googleMapsApiKey); // Debugging

app.get('/test-maps', async (req, res) => {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: '1600 Amphitheatre Parkway, Mountain View, CA',
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        res.json(response.data); // Send the API response back to the client
    } catch (error) {
        console.error('Error calling Google Maps API:', error.message);
        res.status(500).json({ error: 'Google Maps API call failed' });
    }
});
app.get('/calculate-distance', async (req, res) => {
    try {
        const { origin, destination } = req.query;

        // Check for missing parameters
        if (!origin || !destination) {
            return res.status(400).json({ error: 'Invalid input: origin and destination must be specified.' });
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
                origins: origin,
                destinations: destination,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        const data = response.data;

        // Handle specific API response statuses
        if (data.status === 'INVALID_REQUEST') {
            return res.status(400).json({ error: 'Invalid request to the Google API. Please check your input.' });
        }

        const element = data.rows[0]?.elements[0];
        if (!element || element.status === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Unable to calculate distance: origin or destination not found.' });
        }

        // Return valid results
        res.json({
            origin: data.origin_addresses[0],
            destination: data.destination_addresses[0],
            distance: element.distance.text,
            duration: element.duration.text
        });
    } catch (error) {
        console.error('Error calling Google Distance Matrix API:', error.message);
        res.status(500).json({ error: 'Internal server error while calculating distance.' });
    }
});


const PORT = 3000; // Define the port

// Middleware to parse incoming JSON data
app.use(express.json());

// Debugging log to confirm server startup
console.log('Server loaded. Routes about to be registered.');

// Register authentication routes
try {
    console.log('Registering authentication routes...');
    app.use('/auth', authRoutes);
    console.log('Authentication routes registered.');
} catch (error) {
    console.error('Error loading auth routes:', error.message);
}

// Register ride management routes
try {
    console.log('Registering ride management routes...');
    app.use('/rides', ridesRoutes); // Register the /rides routes
    console.log('Ride management routes registered.');
} catch (error) {
    console.error('Error loading rides.js:', error.message);
}

// Register driver-specific routes (uses ridesRoutes for driver-specific operations like earnings)
try {
    console.log('Registering driver-specific routes...');
    app.use('/driver', ridesRoutes); // Register driver-specific routes
    console.log('Driver-specific routes registered.');
} catch (error) {
    console.error('Error loading driver-specific routes:', error.message);
}

// Test route to confirm server is working
app.get('/', (req, res) => {
    res.send('Welcome to Belfast Rides Backend!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
