import { Server } from 'socket.io';
import { RoomManager } from './roomManager';

export class VoiceChatManager {
  private io: Server;
  private roomManager: RoomManager;

  constructor(io: Server, roomManager: RoomManager) {
    this.io = io;
    this.roomManager = roomManager;
  }

  setupVoiceEventHandlers(socket: any, currentRoomId: () => string | null, currentUserId: () => string | null) {
    socket.on('voice-join', (data: { roomId: string; userId: string; userName: string; userColor: string }) => {
      this.handleVoiceJoin(socket, data);
    });

    socket.on('voice-leave', (data: { roomId: string; userId: string }) => {
      this.handleVoiceLeave(socket, data);
    });

    socket.on('voice-signal', (data: { roomId: string; targetUserId: string; signal: any; callerUserId: string }) => {
      this.handleVoiceSignal(data);
    });

    socket.on('voice-speaking', (data: { roomId: string; userId: string; isSpeaking: boolean }) => {
      this.handleVoiceSpeaking(socket, data);
    });

    socket.on('voice-mute', (data: { roomId: string; userId: string; isMuted: boolean }) => {
      this.handleVoiceMute(socket, data);
    });
  }

  private async handleVoiceJoin(
    socket: any,
    data: { roomId: string; userId: string; userName: string; userColor: string }
  ) {
    console.log(`User ${data.userName} (${data.userId}) joined voice chat in room ${data.roomId}`);
    
    this.roomManager.addUserToVoiceChat(data.roomId, data.userId);
    
    const existingVoiceUsers = this.roomManager.getVoiceUsers(data.roomId);
    const roomState = await this.roomManager.getRoomState(data.roomId);
    if (existingVoiceUsers.length > 1) {
      const voiceUsersDetails = existingVoiceUsers
        .filter(id => id !== data.userId)
        .map(id => {
          const user = roomState.users.get(id);
          return {
            userId: id,
            userName: user?.name || 'Unknown',
            userColor: user?.color || this.roomManager.getUserColor(id)
          };
        });
      
      console.log(`Sending existing voice users to ${data.userId}:`, voiceUsersDetails);
      socket.emit('voice-room-state', { voiceUsers: voiceUsersDetails });
    }
    socket.to(data.roomId).emit('voice-user-joined', {
      userId: data.userId,
      userName: data.userName,
      userColor: data.userColor
    });
  }

  private handleVoiceLeave(socket: any, data: { roomId: string; userId: string }) {
    console.log(`User ${data.userId} left voice chat in room ${data.roomId}`);
    
    this.roomManager.removeUserFromVoiceChat(data.roomId, data.userId);
    
    socket.to(data.roomId).emit('voice-user-left', {
      userId: data.userId
    });
  }

  private handleVoiceSignal(data: { roomId: string; targetUserId: string; signal: any; callerUserId: string }) {
    console.log(`Relaying signal from ${data.callerUserId} to ${data.targetUserId}`);
    
    const sockets = this.io.sockets.adapter.rooms.get(data.roomId);
    if (!sockets) {
      console.error(`Room ${data.roomId} not found`);
      return;
    }

    for (const socketId of sockets) {
      const targetSocket = this.io.sockets.sockets.get(socketId);
      if (targetSocket && targetSocket.data?.userId === data.targetUserId) {
        targetSocket.emit('voice-signal', {
          callerUserId: data.callerUserId,
          signal: data.signal
        });
        console.log(`Signal delivered to ${data.targetUserId}`);
        return;
      }
    }
    
    console.error(`Target user ${data.targetUserId} not found in room ${data.roomId}`);
  }

  private handleVoiceSpeaking(socket: any, data: { roomId: string; userId: string; isSpeaking: boolean }) {
    socket.to(data.roomId).emit('voice-speaking', {
      userId: data.userId,
      isSpeaking: data.isSpeaking
    });
  }

  private handleVoiceMute(socket: any, data: { roomId: string; userId: string; isMuted: boolean }) {
    socket.to(data.roomId).emit('voice-mute', {
      userId: data.userId,
      isMuted: data.isMuted
    });
  }

  handleUserDisconnect(roomId: string, userId: string) {
    console.log(`Cleaning up voice chat for user ${userId} in room ${roomId}`);
    
    this.roomManager.removeUserFromVoiceChat(roomId, userId);
    this.io.to(roomId).emit('voice-user-left', {
      userId: userId
    });
  }
}