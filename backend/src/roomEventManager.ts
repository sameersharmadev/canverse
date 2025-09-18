import { RoomManager } from './roomManager';
import { User } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RoomEventManager {
  private roomManager: RoomManager;

  constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
  }

  async handleJoinRoom(
    socket: any,
    data: { roomId: string; userName: string },
    setCurrentRoomId: (id: string) => void,
    setCurrentUserId: (id: string) => void
  ) {
    try {
      console.log('Join room request:', data);
      const { roomId, userName } = data;
      
      const currentUserId = uuidv4();
      setCurrentRoomId(roomId);
      setCurrentUserId(currentUserId);
      
      socket.data = { userId: currentUserId, roomId };
      
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      const user: User = {
        id: currentUserId,
        name: userName,
        color: this.roomManager.getUserColor(currentUserId),
        socketId: socket.id
      };
      
      await this.roomManager.addUserToRoom(roomId, user);
      const roomState = await this.roomManager.getRoomState(roomId);
      
      const voiceUsers = this.roomManager.getVoiceUsers(roomId).map(id => {
        const voiceUser = roomState.users.get(id);
        return {
          userId: id,
          userName: voiceUser?.name || 'Unknown',
          userColor: voiceUser?.color || this.roomManager.getUserColor(id)
        };
      });
      
      socket.emit('room-state', {
        elements: roomState.elements,
        users: Array.from(roomState.users.values()),
        viewport: roomState.viewport,
        backgroundColor: roomState.backgroundColor,
        userId: currentUserId,
        voiceUsers
      });
      
      socket.to(roomId).emit('user-joined', user);
      console.log(`User ${userName} (${currentUserId}) joined room ${roomId}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  async handleUserDisconnect(roomId: string | null, userId: string | null, socket: any) {
    if (roomId && userId) {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      
      await this.roomManager.removeUserFromRoom(roomId, userId);
      socket.to(roomId).emit('user-left', userId);
    }
  }
}