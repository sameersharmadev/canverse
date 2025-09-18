export type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'line' | 'select' | 'pan';

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
  strokeDashArray?: number[];
  isSelected?: boolean;
  fontSize?: number;
  endX?: number;
  endY?: number;
  centerX?: number;
  centerY?: number;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextInput {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
}

export const COLOR_SWATCHES = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
];