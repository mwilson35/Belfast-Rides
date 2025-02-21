const db = require('../db');
const { getWeekStartAndEnd } = require('../utils/dateUtils');

exports.getWeeklyEarnings = (req, res) => {
  const driverId = req.user.id;
  const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd();

  db.query(
    `SELECT SUM(total_earnings) AS totalEarnings 
     FROM weekly_earnings 
     WHERE driver_id = ? AND week_start = ? AND week_end = ?`,
    [driverId, formattedWeekStart, formattedWeekEnd],
    (err, results) => {
      if (err) {
        console.error('Error fetching weekly earnings:', err.message);
        return res.status(500).json({ message: 'Database error' });
      }

      const totalEarnings = results[0]?.totalEarnings || 0;
      res.json({
        message: totalEarnings > 0 
          ? 'Weekly earnings fetched successfully' 
          : 'No earnings found for the current week',
        totalEarnings,
      });
    }
  );
};
