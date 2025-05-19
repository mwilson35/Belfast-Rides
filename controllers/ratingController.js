// controllers/ratingController.js
const db = require('../db');
const { getWeekStartAndEnd } = require('../utils/dateUtils');

exports.submitRating = (req, res) => {
  const { rideId, rateeId, rating, review, tip } = req.body;
  const raterId = req.user.id;

  if (!rideId || !rateeId || !rating) {
    return res.status(400).json({ message: "rideId, rateeId and rating are required." });
  }

  // Check that the ride exists and is completed.
  db.query('SELECT * FROM rides WHERE id = ?', [rideId], (err, rideResults) => {
    if (err) {
      console.error("Error fetching ride:", err);
      return res.status(500).json({ message: "Database error while checking ride status." });
    }
    if (rideResults.length === 0) {
      return res.status(404).json({ message: "Ride not found." });
    }
    
    const ride = rideResults[0];
    if (ride.status !== 'completed') {
      return res.status(400).json({ message: "Ride must be completed before submitting a rating." });
    }
    
    // Check if this user has already submitted a rating for this ride.
    db.query('SELECT id FROM ratings WHERE ride_id = ? AND rater_id = ?', [rideId, raterId], (err, existingRatings) => {
      if (err) {
        console.error("Error checking existing rating:", err);
        return res.status(500).json({ message: "Database error." });
      }
      if (existingRatings.length > 0) {
        return res.status(400).json({ message: "You have already submitted a rating for this ride." });
      }
      
      // Insert the new rating.
      db.query(
        "INSERT INTO ratings (ride_id, rater_id, ratee_id, rating, review) VALUES (?, ?, ?, ?, ?)",
        [rideId, raterId, rateeId, rating, review || null],
        (err, result) => {
          if (err) {
            console.error("Error inserting rating:", err);
            return res.status(500).json({ message: "Error saving rating." });
          }
          
          // Parse the new tip from the request.
          const newTip = tip ? parseFloat(tip) : 0;
          // Now, fetch the current tip stored in the ride.
          db.query("SELECT tip FROM rides WHERE id = ?", [rideId], (err, tipResults) => {
            if (err) {
              console.error("Error fetching current tip:", err);
              return res.status(500).json({ message: "Error fetching current tip." });
            }
            const currentTip = tipResults[0].tip ? parseFloat(tipResults[0].tip) : 0;
            const tipDifference = newTip - currentTip;
            // Update the ride with the new tip (if different)
            db.query("UPDATE rides SET tip = ? WHERE id = ?", [newTip, rideId], (err, updateResult) => {
              if (err) {
                console.error("Error updating ride tip:", err);
                return res.status(500).json({ message: "Error updating tip." });
              }
            
              // Only update earnings if there is a difference.
              if (tipDifference !== 0) {
                // Update driver earnings for this ride by adding the difference.
                db.query(
                  "UPDATE driver_earnings SET amount = amount + ? WHERE ride_id = ?",
                  [tipDifference, rideId],
                  (err, earningsUpdateResult) => {
                    if (err) {
                      console.error("Error updating driver earnings for tip:", err);
                      return res.status(500).json({ message: "Error updating driver earnings for tip." });
                    }
                

                    // Update weekly earnings.
                    const currentDate = new Date();
                    const { formattedWeekStart, formattedWeekEnd } = getWeekStartAndEnd(currentDate);
                    // Use INSERT ... ON DUPLICATE KEY UPDATE to update weekly earnings.
                    db.query(
                      `INSERT INTO weekly_earnings (driver_id, week_start, week_end, total_earnings)
                       VALUES (?, ?, ?, ?)
                       ON DUPLICATE KEY UPDATE total_earnings = total_earnings + ?`,
                      [ride.driver_id, formattedWeekStart, formattedWeekEnd, tipDifference, tipDifference],
                      (err, weeklyUpdateResult) => {
                        if (err) {
                          console.error("Error updating weekly earnings for tip:", err);
                          return res.status(500).json({ message: "Error updating weekly earnings for tip." });
                        }
                   
                        return res.status(201).json({ message: "Rating submitted successfully", ratingId: result.insertId });
                      }
                    );
                  }
                );
              } else {
                return res.status(201).json({ message: "Rating submitted successfully", ratingId: result.insertId });
              }
            });
          });
        }
      );
    });
  });
};

exports.getRating = (req, res) => {
  if (req.user.role === 'rider') {
    return res.status(403).json({ message: 'Riders cannot directly access driver ratings.' });
  }
  
  const userId = req.params.userId;
  db.query(
    "SELECT AVG(rating) AS avgRating, COUNT(*) AS totalRatings FROM ratings WHERE ratee_id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Error fetching ratings:", err);
        return res.status(500).json({ message: "Error retrieving ratings." });
      }
      return res.json(results[0]);
    }
  );
};
