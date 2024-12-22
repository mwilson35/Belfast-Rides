const jwt = require('jsonwebtoken');

// Token Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden: Invalid token' });
        req.user = user;
        next();
    });
};

// Driver Verification Middleware
const verifyDriver = (req, res, next) => {
    if (req.user.role === 'driver' && !req.user.verified) {
        return res.status(403).json({ message: 'Your account has not been verified by an admin.' });
    }
    next();
};

module.exports = { authenticateToken, verifyDriver };
