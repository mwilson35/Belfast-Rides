const db = require('../db');
const { getWeekStartAndEnd } = require('../utils/dateUtils');

exports.getEarnings = (req, res) => {
  const driverId = req.user.id;

  // If "history" is passed in the query, return full history.
  if (req.query.history === 'true') {
    const query = `
      SELECT week_start, week_end, total_earnings 
      FROM weekly_earnings 
      WHERE driver_id = ? 
      ORDER BY week_start DESC
    `;
    db.query(query, [driverId], (err, results) => {
      if (err) {
        console.error('Error fetching earnings history:', err.message);
        return res.status(500).json({ message: 'Database error' });
      }
      return res.json({
        message: results.length > 0
          ? 'Earnings history fetched successfully'
          : 'No earnings history found',
        history: results,
      });
    });
  } else {
    // Otherwise, return the current week's earnings.
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
  }
};
