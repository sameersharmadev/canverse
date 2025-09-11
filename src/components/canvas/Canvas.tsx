import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { type DrawingElement, type Tool, type TextInput } from '../../types/canvas';
import { Toolbar } from './Toolbar';
import { TextInputOverlay } from './TextInput';
import { CanvasElements } from './CanvasElements';
import { useCanvasHistory } from '../../hooks/useCanvasHistory';

export const Whiteboard = () => {
  const [tool, setTool] = useState<Tool>('pen');
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [textInput, setTextInput] = useState<TextInput | null>(null);
  
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { saveToHistory, undo, redo, canUndo, canRedo } = useCanvasHistory();

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Handle window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === 'Z') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setElements(previousState.elements);
      setBackgroundColor(previousState.backgroundColor);
    }
  };

  const handleRedo = () => {
    const nextState = redo();
    if (nextState) {
      setElements(nextState.elements);
      setBackgroundColor(nextState.backgroundColor);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const colorsMatch = (color1: any, color2: any, tolerance: number = 0) => {
    return Math.abs(color1.r - color2.r) <= tolerance &&
           Math.abs(color1.g - color2.g) <= tolerance &&
           Math.abs(color1.b - color2.b) <= tolerance;
  };

  const floodFill = async (startX: number, startY: number, targetColor: string) => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const tempCanvas = stage.toCanvas({
        x: 0,
        y: 0,
        width: canvasSize.width,
        height: canvasSize.height,
        pixelRatio: 1
      });

      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
      const data = imageData.data;

      const targetRGB = hexToRgb(targetColor);
      if (!targetRGB) return;

      const x = Math.floor(startX);
      const y = Math.floor(startY);
      
      if (x < 0 || x >= canvasSize.width || y < 0 || y >= canvasSize.height) return;

      const startIndex = (y * canvasSize.width + x) * 4;
      const originalColor = {
        r: data[startIndex],
        g: data[startIndex + 1],
        b: data[startIndex + 2],
        a: data[startIndex + 3]
      };

      if (colorsMatch(originalColor, targetRGB)) {
        return;
      }

      const stack = [[x, y]];
      const filledPixels = [];

      while (stack.length > 0) {
        const [currentX, currentY] = stack.pop()!;
        
        if (currentX < 0 || currentX >= canvasSize.width || currentY < 0 || currentY >= canvasSize.height) continue;
        
        const index = (currentY * canvasSize.width + currentX) * 4;
        const currentColor = {
          r: data[index],
          g: data[index + 1],
          b: data[index + 2],
          a: data[index + 3]
        };

        if (!colorsMatch(currentColor, originalColor)) continue;

        data[index] = targetRGB.r;
        data[index + 1] = targetRGB.g;
        data[index + 2] = targetRGB.b;
        data[index + 3] = 255;

        filledPixels.push([currentX, currentY]);

        stack.push([currentX + 1, currentY]);
        stack.push([currentX - 1, currentY]);
        stack.push([currentX, currentY + 1]);
        stack.push([currentX, currentY - 1]);
      }

      if (filledPixels.length > 0) {
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = canvasSize.width;
        fillCanvas.height = canvasSize.height;
        const fillCtx = fillCanvas.getContext('2d');
        
        if (fillCtx) {
          fillCtx.putImageData(imageData, 0, 0);
          
          const fillElement: DrawingElement = {
            id: generateId(),
            type: 'fill',
            x: 0,
            y: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            fill: targetColor,
            fillPath: fillCanvas.toDataURL()
          };

          const newElements = [...elements, fillElement];
          setElements(newElements);
          saveToHistory(newElements, backgroundColor);
        }
      }
    } catch (error) {
      console.error('Flood fill error:', error);
    }
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    if (textInput) {
      handleTextSubmit();
      return;
    }

    setIsDrawing(true);

    if (tool === 'pen' || tool === 'eraser') {
      const newElement: DrawingElement = {
        id: generateId(),
        type: tool,
        points: [pos.x, pos.y],
        stroke: tool === 'pen' ? currentColor : 'transparent',
        strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
        globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
      };
      setCurrentElement(newElement);
    } else if (tool === 'rectangle') {
      const newElement: DrawingElement = {
        id: generateId(),
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: currentColor,
        strokeWidth,
        fill: 'transparent',
      };
      setCurrentElement(newElement);
    } else if (tool === 'circle') {
      const newElement: DrawingElement = {
        id: generateId(),
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        stroke: currentColor,
        strokeWidth,
        fill: 'transparent',
      };
      setCurrentElement(newElement);
    } else if (tool === 'arrow') {
      const newElement: DrawingElement = {
        id: generateId(),
        type: 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: currentColor,
        strokeWidth,
      };
      setCurrentElement(newElement);
    } else if (tool === 'text') {
      const stage = stageRef.current;
      const container = containerRef.current;
      
      if (stage && container) {
        const containerRect = container.getBoundingClientRect();
        const screenX = containerRect.left + pos.x;
        const screenY = containerRect.top + pos.y;
        
        setTextInput({
          id: generateId(),
          x: screenX,
          y: screenY,
          text: ''
        });
      }
      setIsDrawing(false);
    } else if (tool === 'fill') {
      floodFill(pos.x, pos.y, currentColor);
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !currentElement || tool === 'select') return;

    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    if (tool === 'pen' || tool === 'eraser') {
      const updatedElement = {
        ...currentElement,
        points: [...(currentElement.points || []), pos.x, pos.y],
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'rectangle') {
      const updatedElement = {
        ...currentElement,
        width: pos.x - (currentElement.x || 0),
        height: pos.y - (currentElement.y || 0),
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - (currentElement.x || 0), 2) +
        Math.pow(pos.y - (currentElement.y || 0), 2)
      );
      const updatedElement = {
        ...currentElement,
        radius,
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'arrow') {
      const updatedElement = {
        ...currentElement,
        points: [
          currentElement.points![0],
          currentElement.points![1],
          pos.x,
          pos.y,
        ],
      };
      setCurrentElement(updatedElement);
    }
  };

  const handleMouseUp = () => {
    if (currentElement && isDrawing && tool !== 'fill' && tool !== 'text' && tool !== 'select') {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      saveToHistory(newElements, backgroundColor);
    }
    setIsDrawing(false);
    setCurrentElement(null);
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.text.trim()) {
      const stage = stageRef.current;
      const container = containerRef.current;
      
      if (stage && container) {
        const containerRect = container.getBoundingClientRect();
        const canvasX = textInput.x - containerRect.left;
        const canvasY = textInput.y - containerRect.top;
        
        const newElement: DrawingElement = {
          id: textInput.id,
          type: 'text',
          x: canvasX,
          y: canvasY,
          text: textInput.text,
          fill: currentColor,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements, backgroundColor);
      }
    }
    setTextInput(null);
  };

  const handleElementDragEnd = (element: DrawingElement, newPosition: { x: number; y: number }) => {
    const updatedElements = elements.map(el => {
      if (el.id === element.id) {
        return { ...el, x: newPosition.x, y: newPosition.y };
      }
      return el;
    });
    setElements(updatedElements);
    saveToHistory(updatedElements, backgroundColor);
  };

  const clearCanvas = () => {
    const newElements: DrawingElement[] = [];
    const newBgColor = '#ffffff';
    setElements(newElements);
    setBackgroundColor(newBgColor);
    saveToHistory(newElements, newBgColor);
  };

  return (
    <>
      <Toolbar
        tool={tool}
        setTool={setTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={clearCanvas}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {textInput && (
        <TextInputOverlay
          textInput={textInput}
          currentColor={currentColor}
          onTextChange={(text) => setTextInput({ ...textInput, text })}
          onSubmit={handleTextSubmit}
          onCancel={() => setTextInput(null)}
        />
      )}

      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#f9fafb',
          cursor: tool === 'select' ? 'default' : 'crosshair'
        }}
      >
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill={backgroundColor}
              listening={false}
            />
            <CanvasElements
              elements={elements}
              currentElement={currentElement}
              tool={tool}
              canvasSize={canvasSize}
              onElementDragEnd={handleElementDragEnd}
            />
          </Layer>
        </Stage>
      </div>
    </>
  );
};