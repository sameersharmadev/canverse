export interface DrawingElement {
  id: string;
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'fill';
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
  fillPath?: string;
}

export type Tool = 'select' | 'pen' | 'eraser' | 'fill' | 'rectangle' | 'circle' | 'arrow' | 'text';

export interface CanvasState {
  elements: DrawingElement[];
  backgroundColor: string;
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