import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import '../styles/ChatBox.css';

// Shared socket instance
const socket = io(process.env.REACT_APP_BACKEND_URL, { withCredentials: true });

const ChatBox = ({ rideId, role }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Load stored messages when rideId changes
  useEffect(() => {
    if (rideId) {
      const stored = localStorage.getItem(`chatMessages_${rideId}`);
      if (stored) setMessages(JSON.parse(stored));
    }
  }, [rideId]);

  // Persist messages
  useEffect(() => {
    if (rideId) {
      localStorage.setItem(`chatMessages_${rideId}`, JSON.stringify(messages));
    }
  }, [messages, rideId]);

  // Cleanup old stored messages on ride change
  useEffect(() => {
    return () => {
      if (rideId) localStorage.removeItem(`chatMessages_${rideId}`);
    };
  }, [rideId]);

  // Join/leave room and manage listeners
  useEffect(() => {
    if (!rideId) return;

    // Join new room
    socket.emit('joinRoom', { rideId, role });
    console.log(`ChatBox: joined room ${rideId}`);

    // Handler for incoming messages
    const handler = (data) => {
      if (data.rideId === rideId) {
        setMessages(prev => [...prev, data]);
      }
    };

    socket.on('chatMessage', handler);

    return () => {
      // Leave old room
      socket.emit('leaveRoom', { rideId, role });
      console.log(`ChatBox: left room ${rideId}`);
      socket.off('chatMessage', handler);
    };
  }, [rideId, role]);

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    const chatData = { rideId, sender: role, message: messageInput, timestamp: new Date().toISOString() };
    socket.emit('chatMessage', chatData);
    setMessageInput('');
  };

  const handleEnterKey = (e) => { if (e.key === 'Enter') sendMessage(); };

  return (
    <div className="chat-box card p-3 mt-3">
      <h3 className="card-title">Chat</h3>
      <div className="chat-messages mb-3">
        {messages.map((msg, i) => (
          <div key={i} className="chat-message mb-2">
            <strong>{msg.sender}: </strong><span>{msg.message}</span>
          </div>
        ))}
      </div>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={handleEnterKey}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} className="btn btn-primary">Send</button>
      </div>
    </div>
  );
};

export default ChatBox;
