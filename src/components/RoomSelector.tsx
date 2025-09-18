import React, { useState, useEffect } from 'react';
import { Users, ArrowRight, ArrowLeft, Link2 } from 'lucide-react';
import background from '../assets/background_canverse.webp';

interface RoomSelectorProps {
  onJoinRoom: (roomId: string, userName: string) => void;
}

const checkRoomExists = async (roomId: string) => {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const res = await fetch(`${backendUrl}/rooms/${roomId}/info`);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.roomId;
  } catch {
    return false;
  }
};

const extractRoomIdFromUrl = (input: string): string => {
  try {
    const url = new URL(input);
    const roomId = url.searchParams.get('room');
    if (roomId) return roomId.toUpperCase();
  } catch {
  }
  return input.trim().toUpperCase();
};

export const RoomSelector: React.FC<RoomSelectorProps> = ({ onJoinRoom }) => {
  const [userName, setUserName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isJoinFlow, setIsJoinFlow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setIsJoinFlow(true);
      setRoomInput(urlRoomId.toUpperCase());
    }
  }, []);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (userName.trim()) {
      const roomId = generateRoomId();
      window.history.replaceState({}, '', `?room=${roomId}`);
      onJoinRoom(roomId, userName.trim());
    }
  };

  const handleJoinRoom = async () => {
    if (userName.trim() && roomInput.trim()) {
      setIsJoining(true);
      setError('');
      
      const roomId = extractRoomIdFromUrl(roomInput);
      
      if (roomId.length < 4) {
        setError('Please enter a valid room ID or URL');
        setIsJoining(false);
        return;
      }

      try {
        const exists = await checkRoomExists(roomId);
        if (!exists) {
          setError('Room not found. Check the room ID or ask for a new invite.');
          setIsJoining(false);
          return;
        }
        
        window.history.replaceState({}, '', `?room=${roomId}`);
        onJoinRoom(roomId, userName.trim());
      } catch {
        setError('Failed to check room. Please try again.');
        setIsJoining(false);
      }
    }
  };

  const resetFlow = () => {
    setIsJoinFlow(false);
    setRoomInput('');
    setError('');
    window.history.replaceState({}, '', '/');
  };

  if (isJoinFlow) {
    return (
      <div 
        className="min-h-screen flex"
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Left Form Section */}
        <div className="w-1/2 min-h-screen bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <div className="flex items-center mb-5 gap-4">
                <Link2 size={40} className="text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Join Room</h1>
                  <p className="text-gray-600 text-sm">Enter your details to join the whiteboard</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-blue-500 transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && userName.trim() && roomInput.trim() && handleJoinRoom()}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Room ID or Link
              </label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Paste invite link or Room ID"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-blue-500 transition-colors font-mono"
                onKeyPress={(e) => e.key === 'Enter' && userName.trim() && roomInput.trim() && handleJoinRoom()}
              />
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Enter room ID or paste full invite link
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleJoinRoom}
                disabled={!userName.trim() || !roomInput.trim() || isJoining}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Room
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-gray-500 text-sm">or</span>
                </div>
              </div>
              
              <button
                onClick={resetFlow}
                className="w-full text-blue-600 py-3 px-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 border-2 border-blue-200"
              >
                <ArrowLeft size={16} />
                Back to Create
              </button>
            </div>
          </div>
        </div>

        {/* Right Background Section */}
        <div className="w-1/2 min-h-screen">
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Left Form Section */}
      <div className="w-1/2 min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="flex items-center mb-5 gap-4">
              <Users size={40} className="text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Canverse</h1>
                <p className="text-gray-600 text-sm">Collaborative whiteboard for teams</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-blue-500 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && userName.trim() && handleCreateRoom()}
            />
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateRoom}
              disabled={!userName.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Create New Room
              <ArrowRight size={16} />
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-gray-500 text-sm">or</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsJoinFlow(true)}
              className="w-full text-blue-600 py-3 px-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 border-2 border-blue-200"
            >
              <Link2 size={16} />
              Have an invite? Join room
            </button>
          </div>
        </div>
      </div>

      {/* Right Background Section */}
      <div className="w-1/2 min-h-screen">
      </div>
    </div>
  );
};