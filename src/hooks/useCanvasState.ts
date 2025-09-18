import { useState, useCallback } from 'react';
import type { DrawingElement, Tool, TextInput, SelectionBox } from '../types/canvas';

export const useCanvasState = () => {
  // Drawing state
  const [tool, setTool] = useState<Tool>('pen');
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textInput, setTextInput] = useState<TextInput | null>(null);

  // Canvas state
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Selection state
  const [selection, setSelection] = useState<{
    elements: string[];
    box: SelectionBox | null;
    isActive: boolean;
  }>({ elements: [], box: null, isActive: false });

  // Collaboration state
  const [connectedUsers, setConnectedUsers] = useState<Map<string, any>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [remoteElements, setRemoteElements] = useState<DrawingElement[]>([]);
  const [copied, setCopied] = useState(false);

  const clearSelection = useCallback(() => {
    setSelection({ elements: [], box: null, isActive: false });
  }, []);

  const clearCanvas = useCallback(() => {
    setElements([]);
    setBackgroundColor('#ffffff');
    clearSelection();
  }, [clearSelection]);

  return {
    // Drawing state
    tool, setTool,
    elements, setElements,
    isDrawing, setIsDrawing,
    currentColor, setCurrentColor,
    strokeWidth, setStrokeWidth,
    currentElement, setCurrentElement,
    backgroundColor, setBackgroundColor,
    textInput, setTextInput,
    
    // Canvas state
    viewport, setViewport,
    canvasSize, setCanvasSize,
    isPanning, setIsPanning,
    lastPanPoint, setLastPanPoint,
    
    // Selection state
    selection, setSelection,
    clearSelection,
    
    // Collaboration state
    connectedUsers, setConnectedUsers,
    currentUserId, setCurrentUserId,
    isConnected, setIsConnected,
    remoteElements, setRemoteElements,
    copied, setCopied,
    
    // Actions
    clearCanvas
  };
};