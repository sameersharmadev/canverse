import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis, closeRedis, redisClient } from './redis'; 
import { RoomManager } from './roomManager';
import { DrawingElement, User } from './types';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/rooms/:roomId/info', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    let roomExists = false;
    let roomState;
    
    if (roomManager.hasRoom(roomId)) {
      roomExists = true;
      roomState = await roomManager.getRoomState(roomId);
    } else {
      try {
        const redisData = await redisClient.get(`room:${roomId}`);
        if (redisData) {
          roomExists = true;
          roomState = await roomManager.getRoomState(roomId);
        }
      } catch (error) {
        console.error('Redis check failed:', error);
      }
    }
    
    if (!roomExists) {
      roomExists = true;
      roomState = {
        elements: [],
        users: new Map(),
        viewport: { x: 0, y: 0, scale: 1 },
        backgroundColor: '#ffffff',
        lastActivity: Date.now()
      };
    }
    
    res.json({
      roomId: roomExists ? roomId : null,
      exists: roomExists,
      userCount: roomState?.users?.size || 0,
      elementCount: roomState?.elements?.length || 0,
      lastActivity: roomState?.lastActivity || Date.now()
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join-room', async (data: { roomId: string; userName: string }) => {
    try {
      console.log('Join room request:', data);
      const { roomId, userName } = data;
      
      if (currentRoomId && currentUserId) {
        console.log('Socket already in room, ignoring duplicate join');
        return;
      }
      
      currentRoomId = roomId;
      currentUserId = uuidv4();
      
      socket.data = { userId: currentUserId, roomId };
      
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      const user: User = {
        id: currentUserId,
        name: userName,
        color: roomManager.getUserColor(currentUserId),
        socketId: socket.id
      };
      
      await roomManager.addUserToRoom(roomId, user);
      const roomState = await roomManager.getRoomState(roomId);
      
      const voiceUsers = roomManager.getVoiceUsers(roomId).map(id => {
        const voiceUser = roomState.users.get(id);
        return {
          userId: id,
          userName: voiceUser?.name || 'Unknown',
          userColor: voiceUser?.color || roomManager.getUserColor(id)
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
  });

  socket.on('voice-join', async (data: { roomId: string; userId: string; userName: string; userColor: string }) => {
    console.log(`User ${data.userName} (${data.userId}) joined voice chat in room ${data.roomId}`);
    
    roomManager.addUserToVoiceChat(data.roomId, data.userId);
    
    const existingVoiceUsers = roomManager.getVoiceUsers(data.roomId);
    const roomState = await roomManager.getRoomState(data.roomId);
    
    if (existingVoiceUsers.length > 1) {
      const voiceUsersDetails = existingVoiceUsers
        .filter(id => id !== data.userId)
        .map(id => {
          const user = roomState.users.get(id);
          return {
            userId: id,
            userName: user?.name || 'Unknown',
            userColor: user?.color || roomManager.getUserColor(id)
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
  });

  socket.on('voice-leave', (data: { roomId: string; userId: string }) => {
    console.log(`User ${data.userId} left voice chat in room ${data.roomId}`);
    
    roomManager.removeUserFromVoiceChat(data.roomId, data.userId);
    
    socket.to(data.roomId).emit('voice-user-left', {
      userId: data.userId
    });
  });

  socket.on('voice-signal', (data: { roomId: string; targetUserId: string; signal: any; callerUserId: string }) => {
    console.log(`Relaying signal from ${data.callerUserId} to ${data.targetUserId}`);
    
    const sockets = io.sockets.adapter.rooms.get(data.roomId);
    if (sockets) {
      for (const socketId of sockets) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket && targetSocket.data?.userId === data.targetUserId) {
          targetSocket.emit('voice-signal', {
            callerUserId: data.callerUserId,
            signal: data.signal
          });
          console.log(`Signal delivered to ${data.targetUserId}`);
          break;
        }
      }
    }
  });

  socket.on('voice-speaking', (data: { roomId: string; userId: string; isSpeaking: boolean }) => {
    socket.to(data.roomId).emit('voice-speaking', {
      userId: data.userId,
      isSpeaking: data.isSpeaking
    });
  });

  socket.on('voice-mute', (data: { roomId: string; userId: string; isMuted: boolean }) => {
    socket.to(data.roomId).emit('voice-mute', {
      userId: data.userId,
      isMuted: data.isMuted
    });
  });

  socket.on('disconnect', async (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    if (currentRoomId && currentUserId) {
      roomManager.removeUserFromVoiceChat(currentRoomId, currentUserId);
      
      socket.to(currentRoomId).emit('voice-user-left', {
        userId: currentUserId
      });
      
      await roomManager.removeUserFromRoom(currentRoomId, currentUserId);
      socket.to(currentRoomId).emit('user-left', currentUserId);
    }
  });

  socket.on('drawing-start', async (data: { roomId: string; element: DrawingElement }) => {
    try {
      const { roomId, element } = data;
      element.userId = currentUserId!;
      element.timestamp = Date.now();
      
      socket.to(roomId).emit('drawing-start', element);
      
    } catch (error) {
      console.error('Error handling drawing start:', error);
    }
  });

  socket.on('drawing-update', async (data: { roomId: string; element: DrawingElement }) => {
    try {
      const { roomId, element } = data;
      element.userId = currentUserId!;
      element.timestamp = Date.now();
      
      socket.to(roomId).emit('drawing-update', element);
      
    } catch (error) {
      console.error('Error handling drawing update:', error);
    }
  });

  socket.on('drawing-end', async (data: { roomId: string; element: DrawingElement }) => {
    try {
      const { roomId, element } = data;
      element.userId = currentUserId!;
      element.timestamp = Date.now();
      
      await roomManager.addElementToRoom(roomId, element);
      socket.to(roomId).emit('drawing-end', element);
      
    } catch (error) {
      console.error('Error handling drawing end:', error);
    }
  });

  socket.on('cursor-move', async (data: { roomId: string; x: number; y: number }) => {
    try {
      const { roomId, x, y } = data;
      
      if (currentUserId) {
        await roomManager.updateUserCursor(roomId, currentUserId, { x, y });
        
        socket.to(roomId).emit('cursor-update', {
          userId: currentUserId,
          x,
          y
        });
      }
      
    } catch (error) {
      console.error('Error handling cursor move:', error);
    }
  });

  socket.on('elements-deleted', async (data: { roomId: string; elementIds: string[] }) => {
    try {
      const { roomId, elementIds } = data;
      
      await roomManager.deleteElements(roomId, elementIds);
      socket.to(roomId).emit('elements-deleted', elementIds);
      
    } catch (error) {
      console.error('Error handling element deletion:', error);
    }
  });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();