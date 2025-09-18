import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis, redisClient } from './redis';
import { RoomManager } from './roomManager';
import { VoiceChatManager } from './voiceChatManager';
import { DrawingManager } from './drawingManager';
import { RoomEventManager } from './roomEventManager';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();
const voiceChatManager = new VoiceChatManager(io, roomManager);
const drawingManager = new DrawingManager(roomManager);
const roomEventManager = new RoomEventManager(roomManager);

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

  const getCurrentRoomId = () => currentRoomId;
  const getCurrentUserId = () => currentUserId;
  const setCurrentRoomId = (id: string) => { currentRoomId = id; };
  const setCurrentUserId = (id: string) => { currentUserId = id; };

  socket.on('join-room', async (data: { roomId: string; userName: string }) => {
    if (currentRoomId && currentUserId) {
      console.log('Socket already in room, ignoring duplicate join');
      return;
    }
    
    await roomEventManager.handleJoinRoom(socket, data, setCurrentRoomId, setCurrentUserId);
  });

  voiceChatManager.setupVoiceEventHandlers(socket, getCurrentRoomId, getCurrentUserId);
  drawingManager.setupDrawingEventHandlers(socket, getCurrentUserId);

  socket.on('disconnect', async (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    if (currentRoomId && currentUserId) {
      voiceChatManager.handleUserDisconnect(currentRoomId, currentUserId);
      await roomEventManager.handleUserDisconnect(currentRoomId, currentUserId, socket);
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const startServer = async () => {
  try {
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://${HOST}/health`);
    });
    setInterval(() => {
      fetch(`http://${HOST}/health`)
        .then(() => {
          console.log('Keep-alive ping sent');
        })
        .catch(() => {
          console.log('Keep-alive ping failed');
        });
    }, 2 * 60 * 1000); 

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});