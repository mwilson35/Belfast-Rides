const db = require('../db');

exports.verifyDriver = async (req, res) => {
  const { driverId } = req.body;

  // Ensure the user making the request is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access only.' });
  }

  if (!driverId) {
    return res.status(400).json({ message: 'Driver ID is required.' });
  }

  try {
    // Update the driver's verified status
    db.query(
      'UPDATE users SET verified = ? WHERE id = ? AND role = ?',
      [true, driverId, 'driver'],
      (err, results) => {
        if (err) {
          console.error('Error verifying driver:', err.message);
          return res.status(500).json({ message: 'Database error during verification.' });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Driver not found or already verified.' });
        }

        res.json({ message: 'Driver verified successfully.', driverId });
      }
    );
  } catch (error) {
    console.error('Error during driver verification:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
