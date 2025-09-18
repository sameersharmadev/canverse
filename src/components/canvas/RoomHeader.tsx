import React from 'react';
import { Copy, LogOut } from 'lucide-react';
import { Toast } from '../Toast';

interface RoomHeaderProps {
  roomId: string;
  connectedUsers: Map<string, any>;
  isConnected: boolean;
  copied: boolean;
  onCopyRoomLink: () => void;
  onLeaveRoom: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  connectedUsers,
  isConnected,
  copied,
  onCopyRoomLink,
  onLeaveRoom
}) => {
  const userList = Array.from(connectedUsers.values());
  const displayedUsers = userList.slice(0, 3);
  const extraUsersCount = Math.max(0, userList.length - 3);

  return (
    <>
      <Toast message="Link copied!" visible={copied} />
      <div className="fixed top-2 left-5 z-[10001] bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 flex items-center gap-3 font-inter text-sm font-medium">
        <span
          className="text-gray-800 cursor-pointer select-none transition-all duration-200 hover:text-blue-600"
          title="Click to copy room link"
          onClick={onCopyRoomLink}
        >
          Room: <span className="text-blue-600 font-bold font-mono bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-0.5 rounded-md cursor-pointer">{roomId}</span>
        </span>
        
        <button
          onClick={onCopyRoomLink}
          className="bg-transparent border-none rounded-lg p-1.5 cursor-pointer flex items-center transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
          title={copied ? "Copied!" : "Copy room link"}
        >
          <Copy size={16} />
        </button>
      </div>

      <div className="fixed top-2 right-5 z-[10001] bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 flex items-center gap-3 font-inter">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center">
              {displayedUsers.map((user) => (
                <div
                  key={user.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  style={{ backgroundColor: user.color || '#6b7280' }}
                  title={user.name}
                >
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              ))}
              {extraUsersCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                  +{extraUsersCount}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-600 font-medium ml-1">
              {isConnected ? `${connectedUsers.size} online` : 'Connecting...'}
            </span>
          </div>
        </div>
        
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
        
        <button
          onClick={onLeaveRoom}
          className="bg-transparent border-none rounded-lg p-1.5 cursor-pointer flex items-center transition-all duration-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
          title="Leave room"
        >
          <LogOut size={16} />
        </button>
      </div>
    </>
  );
};