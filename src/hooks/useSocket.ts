import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { DrawingElement } from '../types/canvas';

interface UseSocketProps {
  roomId: string;
  userName: string;
  onRoomState: (data: any) => void;
  onUserJoined: (user: any) => void;
  onUserLeft: (userId: string) => void;
  onDrawingStart: (element: DrawingElement) => void;
  onDrawingUpdate: (element: DrawingElement) => void;
  onDrawingEnd: (element: DrawingElement) => void;
  onCursorUpdate: (data: { userId: string; x: number; y: number }) => void;
  onElementsDeleted: (elementIds: string[]) => void;
  onVoiceRoomState?: (data: { voiceUsers: any[] }) => void;
}

export const useSocket = ({
  roomId,
  userName,
  onRoomState,
  onUserJoined,
  onUserLeft,
  onDrawingStart,
  onDrawingUpdate,
  onDrawingEnd,
  onCursorUpdate,
  onElementsDeleted,
  onVoiceRoomState
}: UseSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const currentRoomRef = useRef<string | null>(null);

  const stableCallbacks = useRef({
    onRoomState,
    onUserJoined,
    onUserLeft,
    onDrawingStart,
    onDrawingUpdate,
    onDrawingEnd,
    onCursorUpdate,
    onElementsDeleted,
    onVoiceRoomState
  });

  useEffect(() => {
    stableCallbacks.current = {
      onRoomState,
      onUserJoined,
      onUserLeft,
      onDrawingStart,
      onDrawingUpdate,
      onDrawingEnd,
      onCursorUpdate,
      onElementsDeleted,
      onVoiceRoomState
    };
  });

  useEffect(() => {
    if (socketRef.current && currentRoomRef.current === roomId) {
      return;
    }

    if (socketRef.current && currentRoomRef.current !== roomId) {
      console.log('Room changed, cleaning up existing socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      hasJoinedRef.current = false;
      isConnectedRef.current = false;
    }

    console.log('Creating new socket connection for room:', roomId);
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const socket = io(backendUrl);
    socketRef.current = socket;
    currentRoomRef.current = roomId;

    socket.on('connect', () => {
      console.log('Connected to server');
      isConnectedRef.current = true;
      
      if (!hasJoinedRef.current) {
        console.log('Joining room:', roomId, 'as', userName);
        socket.emit('join-room', { roomId, userName });
        hasJoinedRef.current = true;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      isConnectedRef.current = false;
      hasJoinedRef.current = false;
    });

    socket.on('room-state', (data) => stableCallbacks.current.onRoomState(data));
    socket.on('user-joined', (user) => stableCallbacks.current.onUserJoined(user));
    socket.on('user-left', (userId) => stableCallbacks.current.onUserLeft(userId));
    socket.on('drawing-start', (element) => stableCallbacks.current.onDrawingStart(element));
    socket.on('drawing-update', (element) => stableCallbacks.current.onDrawingUpdate(element));
    socket.on('drawing-end', (element) => stableCallbacks.current.onDrawingEnd(element));
    socket.on('cursor-update', (data) => stableCallbacks.current.onCursorUpdate(data));
    socket.on('elements-deleted', (elementIds) => stableCallbacks.current.onElementsDeleted(elementIds));
    
    if (stableCallbacks.current.onVoiceRoomState) {
      socket.on('voice-room-state', (data) => stableCallbacks.current.onVoiceRoomState?.(data));
    }

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      console.log('Cleaning up socket connection');
      hasJoinedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      currentRoomRef.current = null;
    };
  }, [roomId, userName]); 

  const emitDrawingStart = useCallback((element: DrawingElement) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('drawing-start', { roomId, element });
    }
  }, [roomId]);

  const emitDrawingUpdate = useCallback((element: DrawingElement) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('drawing-update', { roomId, element });
    }
  }, [roomId]);

  const emitDrawingEnd = useCallback((element: DrawingElement) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('drawing-end', { roomId, element });
    }
  }, [roomId]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('cursor-move', { roomId, x, y });
    }
  }, [roomId]);

  const emitElementsDeleted = useCallback((elementIds: string[]) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('elements-deleted', { roomId, elementIds });
    }
  }, [roomId]);

  return {
    socket: socketRef.current,
    emitDrawingStart,
    emitDrawingUpdate,
    emitDrawingEnd,
    emitCursorMove,
    emitElementsDeleted,
    isConnected: isConnectedRef.current
  };
};

