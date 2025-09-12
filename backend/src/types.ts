export interface DrawingElement {
  id: string;
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'line';
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  globalCompositeOperation?: string;
  userId?: string;
  timestamp?: number;
}

export interface User {
  id: string;
  name: string;
  cursor?: { x: number; y: number };
  color: string;
  socketId: string;
}

export interface RoomState {
  id: string;
  elements: DrawingElement[];
  users: Map<string, User>;
  viewport: { x: number; y: number; scale: number };
  backgroundColor: string;
  lastActivity: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
}