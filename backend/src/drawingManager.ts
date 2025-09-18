import { RoomManager } from './roomManager';
import { DrawingElement } from './types';

export class DrawingManager {
  private roomManager: RoomManager;

  constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
  }

  setupDrawingEventHandlers(socket: any, currentUserId: () => string | null) {
    socket.on('drawing-start', (data: { roomId: string; element: DrawingElement }) => {
      this.handleDrawingStart(socket, data, currentUserId());
    });

    socket.on('drawing-update', (data: { roomId: string; element: DrawingElement }) => {
      this.handleDrawingUpdate(socket, data, currentUserId());
    });

    socket.on('drawing-end', (data: { roomId: string; element: DrawingElement }) => {
      this.handleDrawingEnd(socket, data, currentUserId());
    });

    socket.on('cursor-move', (data: { roomId: string; x: number; y: number }) => {
      this.handleCursorMove(socket, data, currentUserId());
    });

    socket.on('elements-deleted', (data: { roomId: string; elementIds: string[] }) => {
      this.handleElementsDeleted(socket, data);
    });
  }

  private handleDrawingStart(socket: any, data: { roomId: string; element: DrawingElement }, userId: string | null) {
    try {
      if (!userId) {
        console.error('No user ID for drawing start');
        return;
      }

      const { roomId, element } = data;
      element.userId = userId;
      element.timestamp = Date.now();
      
      socket.to(roomId).emit('drawing-start', element);
      
    } catch (error) {
      console.error('Error handling drawing start:', error);
    }
  }

  private handleDrawingUpdate(socket: any, data: { roomId: string; element: DrawingElement }, userId: string | null) {
    try {
      if (!userId) {
        console.error('No user ID for drawing update');
        return;
      }

      const { roomId, element } = data;
      element.userId = userId;
      element.timestamp = Date.now();
      
      socket.to(roomId).emit('drawing-update', element);
      
    } catch (error) {
      console.error('Error handling drawing update:', error);
    }
  }

  private async handleDrawingEnd(socket: any, data: { roomId: string; element: DrawingElement }, userId: string | null) {
    try {
      if (!userId) {
        console.error('No user ID for drawing end');
        return;
      }

      const { roomId, element } = data;
      element.userId = userId;
      element.timestamp = Date.now();
      
      await this.roomManager.addElementToRoom(roomId, element);
      socket.to(roomId).emit('drawing-end', element);
      
    } catch (error) {
      console.error('Error handling drawing end:', error);
    }
  }

  private async handleCursorMove(socket: any, data: { roomId: string; x: number; y: number }, userId: string | null) {
    try {
      if (!userId) return;

      const { roomId, x, y } = data;
      
      await this.roomManager.updateUserCursor(roomId, userId, { x, y });
      
      socket.to(roomId).emit('cursor-update', {
        userId: userId,
        x,
        y
      });
      
    } catch (error) {
      console.error('Error handling cursor move:', error);
    }
  }

  private async handleElementsDeleted(socket: any, data: { roomId: string; elementIds: string[] }) {
    try {
      const { roomId, elementIds } = data;
      
      await this.roomManager.deleteElements(roomId, elementIds);
      socket.to(roomId).emit('elements-deleted', elementIds);
      
    } catch (error) {
      console.error('Error handling element deletion:', error);
    }
  }
}