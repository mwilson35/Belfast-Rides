// src/components/RatingModal.js
import React, { useState } from 'react';
import api from '../services/api';

const RatingModal = ({ rideId, rateeId, onClose, onRatingSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState(''); // Renamed from comment to review
  const [tip, setTip] = useState(''); // New tip state
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      // Submit the rating along with the tip (defaulting to 0 if not provided)
      await api.post('/ratings', { rideId, rateeId, rating, review, tip: tip || 0 });
      onRatingSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error submitting rating. Please try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h3>Rate Your Driver</h3>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="rating">Rating:</label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value={1}>1 - Poor</option>
            <option value={2}>2 - Fair</option>
            <option value={3}>3 - Good</option>
            <option value={4}>4 - Very Good</option>
            <option value={5}>5 - Excellent</option>
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="review">Review:</label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            style={{ width: '100%', height: '80px', marginTop: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="tip">Tip (optional):</label>
          <input
            id="tip"
            type="number"
            placeholder="Enter tip amount"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ marginRight: '1rem' }}>Cancel</button>
          <button onClick={handleSubmit}>Submit Rating</button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
