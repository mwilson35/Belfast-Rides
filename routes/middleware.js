const jwt = require('jsonwebtoken');

// Token Authentication Middleware
// Token Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Authorization header:', authHeader); // Log the full header
    console.log('Extracted token:', token); // Log the extracted token

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) {
            console.log('Invalid token:', err.message); // Log the error message
            return res.status(403).json({ message: 'Forbidden: Invalid token' });
        }
        console.log('Token verified successfully:', user); // Log the decoded token payload
        req.user = user;
        next();
    });
};

// Driver Verification Middleware
const verifyDriver = (req, res, next) => {
    console.log('Verifying driver middleware:', req.user); // Debugging

    if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Forbidden: Only drivers can proceed.' });
    }
    if (!req.user.verified) {
        return res.status(403).json({ message: 'Your account has not been verified by an admin.' });
    }

    next();
};

module.exports = { authenticateToken, verifyDriver };
