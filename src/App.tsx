import { useState } from 'react';
import { Whiteboard } from './components/canvas/Canvas';
import { RoomSelector } from './components/RoomSelector.tsx';

function App() {
  const [currentRoom, setCurrentRoom] = useState<{
    roomId: string;
    userName: string;
  } | null>(null);

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
