import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import '../styles/ChatBox.css'; // Import custom ChatBox styles

const ChatBox = ({ rideId, role }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);  // Array of chat messages
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    // Connect to the Socket.IO server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Once connected, join the room using the rideId and role
    if (rideId) {
      newSocket.emit('joinRoom', { rideId, role });
    }

    // Listen for incoming chat messages
    newSocket.on('chatMessage', (data) => {
      setMessages(prevMessages => [...prevMessages, data]);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [rideId, role]);

  const sendMessage = () => {
    if (messageInput.trim() === '' || !socket) return;
    const chatData = {
      rideId,
      sender: role,
      message: messageInput,
      timestamp: new Date().toISOString(),
    };
  
    // Emit the message to the server; let the server's response update the state
    socket.emit('chatMessage', chatData);
    setMessageInput('');
  };
  

  const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-box card p-3 mt-3">
      <h3 className="card-title">Chat</h3>
      <div className="chat-messages mb-3">
        {messages.map((msg, index) => (
          <div key={index} className="chat-message mb-2">
            <strong>{msg.sender}: </strong>
            <span>{msg.message}</span>
          </div>
        ))}
      </div>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleEnterKey}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} className="btn btn-primary">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
