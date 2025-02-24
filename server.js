const cors = require('cors');
const express = require('express'); // Import express
const app = express(); // Initialize express app
require('dotenv').config();
const axios = require('axios');
const authRoutes = require('./routes/auth'); // Import auth routes
const ridesRoutes = require('./routes/rides'); // Import ride management routes
const db = require('./db'); // Import database connection
const userDocumentsRouter = require('./routes/userDocuments');
const ratingsRouter = require('./routes/ratings');
const http = require('http'); // For Socket.IO integration
const { Server } = require('socket.io');

app.use(cors());


// Middleware to parse incoming JSON data and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes for documents and ratings
app.use('/documents', userDocumentsRouter);
app.use('/ratings', ratingsRouter);

// Map and related endpoints
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
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Google Maps API:', error.message);
        res.status(500).json({ error: 'Google Maps API call failed' });
    }
});

app.get('/calculate-distance', async (req, res) => {
    try {
        const { origin, destination } = req.query;
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
        if (data.status === 'INVALID_REQUEST') {
            return res.status(400).json({ error: 'Invalid request to the Google API. Please check your input.' });
        }
        const element = data.rows[0]?.elements[0];
        if (!element || element.status === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Unable to calculate distance: origin or destination not found.' });
        }
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

app.get('/get-directions', async (req, res) => {
    try {
        const { origin, destination } = req.query;
        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
            params: {
                origin: origin,
                destination: destination,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching directions:', error.message);
        res.status(500).json({ error: 'Failed to fetch directions' });
    }
});

app.get('/static-map', (req, res) => {
    const { center, zoom = 12 } = req.query;
    const size = '600x400';
    if (!center) {
        return res.status(400).json({ error: "Missing 'center' parameter" });
    }
    const encodedCenter = encodeURIComponent(center);
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodedCenter}&zoom=${zoom}&size=${size}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    console.log('Generated Static Map URL:', url);
    res.json({ url });
});

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
    app.use('/rides', ridesRoutes);
    console.log('Ride management routes registered.');
} catch (error) {
    console.error('Error loading rides.js:', error.message);
}

// Register driver-specific routes (uses ridesRoutes for driver-specific operations like earnings)
try {
    console.log('Registering driver-specific routes...');
    app.use('/driver', ridesRoutes);
    console.log('Driver-specific routes registered.');
} catch (error) {
    console.error('Error loading driver-specific routes:', error.message);
}

// Test route to confirm server is working
app.get('/', (req, res) => {
    res.send('Welcome to Belfast Rides Backend!');
});

// --- Socket.IO Integration ---
// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: { origin: "*" } // Adjust for production
});

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
  
    // Listen for driver location updates (existing code)
    socket.on('driverLocationUpdate', (data) => {
      console.log("Driver location update:", data);
      io.emit('locationUpdate', data);
    });
  
    // Listen for a driver arrival event
    socket.on('driverArrived', (data) => {
      console.log("Driver has arrived:", data);
      // Ideally, emit this only to the rider associated with this ride.
      // For now, we'll broadcast to everyone for testing:
      io.emit('driverArrived', data);
    });
  
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
  

// Start the server using the HTTP server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
