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
  onElementsDeleted
}: UseSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      isConnectedRef.current = true;
      socket.emit('join-room', { roomId, userName });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      isConnectedRef.current = false;
    });

    socket.on('room-state', onRoomState);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('drawing-start', onDrawingStart);
    socket.on('drawing-update', onDrawingUpdate);
    socket.on('drawing-end', onDrawingEnd);
    socket.on('cursor-update', onCursorUpdate);
    socket.on('elements-deleted', onElementsDeleted);

    return () => {
      socket.disconnect();
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
    emitDrawingStart,
    emitDrawingUpdate,
    emitDrawingEnd,
    emitCursorMove,
    emitElementsDeleted,
    isConnected: isConnectedRef.current
  };
};

