import React, { useState } from 'react';

interface RoomSelectorProps {
  onJoinRoom: (roomId: string, userName: string) => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleJoin = () => {
    if (userName.trim() && roomId.trim()) {
      setIsJoining(true);
      onJoinRoom(roomId.toUpperCase(), userName.trim());
    }
  };

  const handleCreateNew = () => {
    if (userName.trim()) {
      const newRoomId = generateRoomId();
      setRoomId(newRoomId);
      setIsJoining(true);
      onJoinRoom(newRoomId, userName.trim());
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '28px',
          color: '#1f2937'
        }}>
          Join Canverse
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Room ID
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter room ID"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              textTransform: 'uppercase'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleJoin}
            disabled={!userName.trim() || !roomId.trim() || isJoining}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: (!userName.trim() || !roomId.trim() || isJoining) ? 0.5 : 1
            }}
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
          
          <button
            onClick={handleCreateNew}
            disabled={!userName.trim() || isJoining}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: (!userName.trim() || isJoining) ? 0.5 : 1
            }}
          >
            Create New
          </button>
        </div>
      </div>
    </div>
  );
};