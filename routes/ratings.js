const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./middleware');

// Endpoint to submit a rating
router.post('/', authenticateToken, (req, res) => {
  const { rideId, rateeId, rating, review } = req.body;
  const raterId = req.user.id;
  
  if (!rideId || !rateeId || !rating) {
    return res.status(400).json({ message: "rideId, rateeId and rating are required." });
  }
  
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
});

// Endpoint to fetch average rating for a user
router.get('/:userId', (req, res) => {
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
});

module.exports = router;
