// src/components/RatingModal.js
import React, { useState } from 'react';
import api from '../services/api';

const RatingModal = ({ rideId, rateeId, onClose, onRatingSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Convert the rating to a number explicitly
    const numericRating = parseInt(rating, 10);
    const payload = { rideId, rateeId, rating: numericRating, review };
    console.log("Submitting rating with payload:", payload);
    try {
      await api.post('/ratings', payload);
      setMessage('Rating submitted successfully.');
      if (onRatingSubmitted) onRatingSubmitted();
      onClose(); // Close the modal after success
    } catch (error) {
      console.error('Error submitting rating:', error.response ? error.response.data : error);
      setMessage('Failed to submit rating.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '2rem', borderRadius: '8px',
        minWidth: '300px'
      }}>
        <h2>Rate Your Driver</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Rating (1-5):</label>
            <input 
              type="number" 
              min="1" 
              max="5" 
              value={rating} 
              onChange={(e) => setRating(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label>Review (optional):</label>
            <textarea 
              value={review} 
              onChange={(e) => setReview(e.target.value)} 
            />
          </div>
          <button type="submit">Submit Rating</button>
          <button type="button" onClick={onClose} style={{ marginLeft: '1rem' }}>Cancel</button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default RatingModal;
