const db = require('../db');

exports.verifyDriver = async (req, res) => {
  const { driverId, verified } = req.body;

  // Ensure the user making the request is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access only.' });
  }

  if (typeof verified !== 'boolean' || !driverId) {
    return res.status(400).json({ message: 'Driver ID and verified status are required.' });
  }

  try {
    db.query(
      'UPDATE users SET verified = ? WHERE id = ? AND role = "driver"',
      [verified, driverId],
      (err, results) => {
        if (err) {
          console.error('Error updating verification:', err.message);
          return res.status(500).json({ message: 'Database error during update.' });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Driver not found or update not applied.' });
        }

        res.json({
          message: `Driver ${verified ? 'verified' : 'unverified'} successfully.`,
          driverId
        });
      }
    );
  } catch (error) {
    console.error('Error in verification handler:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
