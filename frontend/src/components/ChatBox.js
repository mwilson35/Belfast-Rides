// src/components/ChatBox.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const ChatBox = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);  // Array of chat messages
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    // Connect to the Socket.IO server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Listen for incoming chat messages
    newSocket.on('chatMessage', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (messageInput.trim() === '' || !socket) return;
    const chatData = {
      sender: 'Rider', // or dynamically assign based on the user
      message: messageInput,
      timestamp: new Date().toISOString(),
    };

    socket.emit('chatMessage', chatData);
    setMessages((prevMessages) => [...prevMessages, chatData]);
    setMessageInput('');
  };

  const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}>
      <h3>Chat</h3>
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '0.5rem' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '0.5rem' }}>
            <strong>{msg.sender}: </strong>
            <span>{msg.message}</span>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyDown={handleEnterKey}
        placeholder="Type your message..."
        style={{ width: '80%', marginRight: '0.5rem' }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatBox;
