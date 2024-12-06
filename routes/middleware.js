const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']; // Get the Authorization header
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer TOKEN"

    if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

    // Verify the token
    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden: Invalid token' });
        req.user = user; // Add user data to request for use in subsequent handlers
        next(); // Proceed to the next middleware or route handler
    });
};

module.exports = authenticateToken;
