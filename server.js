// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

// Import custom routes and DB connection if needed
const authRoutes = require('./routes/auth');
const ridesRoutes = require('./routes/rides');
const usersRoutes = require('./routes/users');
const userDocumentsRouter = require('./routes/userDocuments');
const ratingsRouter = require('./routes/ratings');
const db = require('./db'); // Ensure your DB connection is set up

const app = express();

// Middleware to enable CORS and parse request bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register common routes
app.use('/users', usersRoutes);
app.use('/documents', userDocumentsRouter);
app.use('/ratings', ratingsRouter);

// Debug: log your Google Maps API key (remove in production)
console.log("Google Maps API Key:", process.env.GOOGLE_MAPS_API_KEY);

// Map and related endpoints
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
  console.error('Error loading rides routes:', error.message);
}

// Register driver-specific routes (reusing ridesRoutes for driver operations)
try {
  console.log('Registering driver-specific routes...');
  app.use('/driver', ridesRoutes);
  console.log('Driver-specific routes registered.');
} catch (error) {
  console.error('Error loading driver-specific routes:', error.message);
}

// Root route to verify server is running
app.get('/', (req, res) => {
  res.send('Welcome to Belfast Rides Backend!');
});

// --- Socket.IO Integration ---
// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings (adjust for production)
const io = new Server(server, {
  cors: { origin: "*" }
});

// Attach io to the app so controllers can access it
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Listen for driver location updates and broadcast to all clients
  socket.on('driverLocationUpdate', (data) => {
    console.log("Driver location update:", data);
    io.emit('locationUpdate', data);
  });

  // Handle driver arrival events
  socket.on('driverArrived', (data) => {
    console.log("Driver has arrived:", data);
    io.emit('driverArrived', data);
  });

  socket.on('chatMessage', (data) => {
    console.log('Chat message received:', data);
    // Broadcast the message to all connected clients.
    io.emit('chatMessage', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
// Start the server on the specified PORT
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
