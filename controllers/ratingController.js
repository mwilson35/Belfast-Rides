// controllers/ratingController.js

const db = require('../db');

exports.submitRating = (req, res) => {
  const { rideId, rateeId, rating, review } = req.body;
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
    
    // Optional: Check if this user has already submitted a rating for this ride.
    db.query(
      'SELECT id FROM ratings WHERE ride_id = ? AND rater_id = ?',
      [rideId, raterId],
      (err, existingRatings) => {
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
            res.status(201).json({ message: "Rating submitted successfully", ratingId: result.insertId });
          }
        );
      }
    );
  });
};

exports.getRating = (req, res) => {
  // Restrict access so that riders cannot directly access driver ratings.
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
      res.json(results[0]);
    }
  );
};
