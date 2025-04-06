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

// Serve static files from the "uploads" folder
app.use('/uploads', express.static('uploads'));

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
  const { path, pickup, destination } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  let url = `https://maps.googleapis.com/maps/api/staticmap?size=600x400`;

  if (path) {
    url += `&path=weight:4|color:blue|enc:${encodeURIComponent(path)}`;
  }

  if (pickup) {
    url += `&markers=color:green|label:P|${encodeURIComponent(pickup)}`;
  }

  if (destination) {
    url += `&markers=color:red|label:D|${encodeURIComponent(destination)}`;
  }

  url += `&key=${apiKey}`;
  
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

  // Listen for clients joining a specific ride room
  socket.on('joinRoom', ({ rideId, role }) => {
    socket.join(rideId);
    // Optionally notify the room that a new user has joined
    socket.to(rideId).emit('chatMessage', {
      sender: 'System',
      message: `${role} has joined the chat.`,
      timestamp: new Date().toISOString()
    });
  });

  // Handle chat messages and emit only to the ride room
  socket.on('chatMessage', (data) => {
    console.log('Chat message received:', data);
    // Ensure that the data includes the rideId to target the correct room
    io.to(data.rideId).emit('chatMessage', data);
  });

  // Other events remain the same
  socket.on('driverLocationUpdate', (data) => {
    console.log("Driver location update:", data);
    io.emit('locationUpdate', data);
  });

  socket.on('driverArrived', (data) => {
    console.log("Driver has arrived:", data);
    io.emit('driverArrived', data);
  });
  socket.on('rideCancelled', (data) => {
    console.log('rideCancelled event from driver:', data);
    io.emit('rideCancelled', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
