import React from 'react';
import { Mic, MicOff, Phone, PhoneOff, Users } from 'lucide-react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { Socket } from 'socket.io-client';

interface VoiceChatProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  isConnected: boolean;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  socket,
  roomId,
  userId,
  userName,
  userColor,
  isConnected
}) => {
  const {
    isInCall,
    isMuted,
    isSpeaking,
    voiceUsers,
    error,
    joinCall,
    leaveCall,
    toggleMute,
    totalInCall
  } = useVoiceChat({
    socket,
    roomId,
    userId,
    userName,
    userColor,
    isConnected
  });

  const currentUser = {
    id: userId,
    name: userName,
    color: userColor,
    isMuted,
    isSpeaking,
    lastSpeakTime: isSpeaking ? Date.now() : 0
  };

  const allUsers = isInCall ? [currentUser, ...voiceUsers] : voiceUsers;
  const sortedUsers = allUsers.sort((a, b) => {
    if (a.isSpeaking && !b.isSpeaking) return -1;
    if (!a.isSpeaking && b.isSpeaking) return 1;
    return b.lastSpeakTime - a.lastSpeakTime;
  });

  return (
    <>
      {/* Join Call Button - Bottom Right */}
      {!isInCall && (
        <div className="fixed bottom-5 right-5 z-[10000]">
          <button
            onClick={joinCall}
            className={`${
              totalInCall > 0 
                ? 'bg-green-500 hover:bg-green-600 animate-pulse shadow-lg' 
                : 'bg-green-500 hover:bg-green-600 shadow-md'
            } text-white p-4 rounded-full transition-all duration-200 flex items-center gap-2`}
            title={totalInCall > 0 ? `Join ${totalInCall} in call` : "Join voice call"}
          >
            <Phone size={20} />
            {totalInCall > 0 && (
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full font-medium">
                {totalInCall}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Voice Chat Panel - Bottom Left when in call */}
      {isInCall && (
        <div className="fixed bottom-5 left-5 z-[10001] bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 p-4 min-w-[280px] max-w-[320px] max-h-[400px] flex flex-col shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Voice Call</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {totalInCall}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isMuted
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              
              <button
                onClick={leaveCall}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                title="Leave Call"
              >
                <PhoneOff size={14} />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Users List (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px]">
            {sortedUsers.map((user) => {
              const isCurrentUser = user.id === userId;
              
              return (
                <div
                  key={user.id}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    user.isSpeaking 
                      ? 'bg-green-50 border-2 border-green-400 shadow-md transform scale-[1.02]' 
                      : isCurrentUser
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with speaking indicator */}
                    <div className="relative">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-all duration-200 ${
                          user.isSpeaking ? 'ring-2 ring-green-400 ring-offset-2' : ''
                        }`}
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Green ring for speaking - more prominent */}
                      {user.isSpeaking && (
                        <div className="absolute -inset-1 rounded-full border-2 border-green-400 animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${
                          user.isSpeaking ? 'text-green-700' : 'text-gray-800'
                        }`}>
                          {isCurrentUser ? 'You' : user.name}
                        </span>
                        {user.isMuted && <MicOff size={12} className="text-red-500 flex-shrink-0" />}
                      </div>
                      
                      {/* Speaking indicator with animation */}
                      {user.isSpeaking && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex gap-0.5">
                            {[...Array(3)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 h-3 bg-green-500 rounded-full animate-pulse"
                                style={{ 
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: '0.8s'
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-green-600 font-medium">Speaking</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {sortedUsers.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">
                Waiting for others to join...
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};