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
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Tool = 'select' | 'pan' | 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'line';

export interface CanvasState {
  elements: DrawingElement[];
  backgroundColor: string;
  viewport?: { x: number; y: number; scale: number };
  selectedElements?: string[];
}

export interface TextInput {
  id: string;
  x: number;
  y: number;
  text: string;
}

export const COLOR_SWATCHES = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
];