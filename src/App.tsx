import { useState, useEffect } from 'react';
import { Whiteboard } from './components/canvas/Canvas';
import { RoomSelector } from './components/RoomSelector.tsx';

function App() {
  const [currentRoom, setCurrentRoom] = useState<{
    roomId: string;
    userName: string;
  } | null>(null);

  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1000);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 1000);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isSmallScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-6 px-6 py-10">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" fill="#fff" stroke="#131313" strokeWidth="3"/>
            <ellipse cx="22" cy="28" rx="4" ry="5" fill="#131313" />
            <ellipse cx="42" cy="28" rx="4" ry="5" fill="#131313" />
            <path d="M24 46c2.5-3 11.5-3 15 0" stroke="#131313" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <h1 className="text-2xl font-bold text-blue-700 font-inter text-center">This website is not (yet) available for smaller screens</h1>
          
        </div>
      </div>
    );
  }

  const handleJoinRoom = (roomId: string, userName: string) => {
    setCurrentRoom({ roomId, userName });
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  if (!currentRoom) {
    return <RoomSelector onJoinRoom={handleJoinRoom} />;
  }

  return (
    <Whiteboard 
      roomId={currentRoom.roomId}
      userName={currentRoom.userName}
      onLeaveRoom={handleLeaveRoom}
    />
  );
}

export default App;
