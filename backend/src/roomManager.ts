import { redisClient } from './redis';
import { RoomState, User, DrawingElement } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private voiceUsers: Map<string, Set<string>> = new Map();

  async getRoomState(roomId: string): Promise<RoomState> {
    let room = this.rooms.get(roomId);
    if (!room) {
      try {
        const redisData = await redisClient.get(`room:${roomId}`);
        if (redisData) {
          const parsed = JSON.parse(
            typeof redisData === 'string' ? redisData : redisData.toString()
          );
          room = {
            ...parsed,
            users: new Map(parsed.users || [])
          };
        }
      } catch (error) {
        console.error('Error getting room from Redis:', error);
      }
      if (!room) {
        room = {
          id: roomId,
          elements: [],
          users: new Map(),
          viewport: { x: 0, y: 0, scale: 1 },
          backgroundColor: '#ffffff',
          lastActivity: Date.now()
        };
      }
      
      this.rooms.set(roomId, room);
      await this.saveRoomToRedis(roomId, room);
    }
    return room;
  }
  async addUserToRoom(roomId: string, user: User): Promise<void> {
    const room = await this.getRoomState(roomId);
    room.users.set(user.id, user);
    room.lastActivity = Date.now();
    this.rooms.set(roomId, room);
    await this.saveRoomToRedis(roomId, room);
  }

  async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(userId);
      room.lastActivity = Date.now();
      
      if (room.users.size === 0) {
        setTimeout(async () => {
          this.rooms.delete(roomId);
          try {
            await redisClient.del(`room:${roomId}`);
          } catch (error) {
            console.error('Error deleting room from Redis:', error);
          }
        }, 5 * 60 * 1000);
      } else {
        await this.saveRoomToRedis(roomId, room);
      }
    }
  }

  async addElementToRoom(roomId: string, element: DrawingElement): Promise<void> {
    const room = await this.getRoomState(roomId);
    room.elements.push(element);
    room.lastActivity = Date.now();
    this.rooms.set(roomId, room);
    await this.saveRoomToRedis(roomId, room);
  }

  async updateUserCursor(roomId: string, userId: string, cursor: { x: number; y: number }): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room && room.users.has(userId)) {
      const user = room.users.get(userId)!;
      user.cursor = cursor;
      room.lastActivity = Date.now();
    }
  }

  async deleteElements(roomId: string, elementIds: string[]): Promise<void> {
    const room = await this.getRoomState(roomId);
    room.elements = room.elements.filter(el => !elementIds.includes(el.id));
    room.lastActivity = Date.now();
    
    this.rooms.set(roomId, room);
    await this.saveRoomToRedis(roomId, room);
  }

  private async saveRoomToRedis(roomId: string, room: RoomState): Promise<void> {
    try {
      const serialized = {
        ...room,
        users: Array.from(room.users.entries())
      };
      
      await redisClient.setEx(
        `room:${roomId}`, 
        24 * 60 * 60, 
        JSON.stringify(serialized)
      );
    } catch (error) {
      console.error('Error saving room to Redis:', error);
    }
  }

  getUserColor(userId: string): string {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  addUserToVoiceChat(roomId: string, userId: string): void {
    if (!this.voiceUsers.has(roomId)) {
      this.voiceUsers.set(roomId, new Set());
    }
    this.voiceUsers.get(roomId)!.add(userId);
  }

  removeUserFromVoiceChat(roomId: string, userId: string): void {
    if (this.voiceUsers.has(roomId)) {
      this.voiceUsers.get(roomId)!.delete(userId);
      if (this.voiceUsers.get(roomId)!.size === 0) {
        this.voiceUsers.delete(roomId);
      }
    }
  }

  getVoiceUsers(roomId: string): string[] {
    return Array.from(this.voiceUsers.get(roomId) || new Set());
  }
}