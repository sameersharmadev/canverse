import { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva'; 
import Konva from 'konva';
import { type DrawingElement, type Tool, type TextInput, type SelectionBox } from '../../types/canvas';
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
  
  // Add viewport state for infinite canvas
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Add selection state
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [transformerRef, setTransformerRef] = useState<Konva.Transformer | null>(null);
  
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { saveToHistory, undo, redo, canUndo, canRedo } = useCanvasHistory();

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale
    };
  }, [viewport]);

  // Check if element is inside selection box
  const isElementInSelection = (element: DrawingElement, selectionBox: SelectionBox): boolean => {
    if (element.type === 'pen' || element.type === 'eraser') {
      // For pen/eraser, check if any point is inside selection
      const points = element.points || [];
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        if (x >= selectionBox.x && x <= selectionBox.x + selectionBox.width &&
            y >= selectionBox.y && y <= selectionBox.y + selectionBox.height) {
          return true;
        }
      }
      return false;
    } else if (element.type === 'rectangle') {
      const elemX = element.x || 0;
      const elemY = element.y || 0;
      const elemWidth = element.width || 0;
      const elemHeight = element.height || 0;
      
      // Check if rectangles overlap
      return !(elemX > selectionBox.x + selectionBox.width ||
               elemX + elemWidth < selectionBox.x ||
               elemY > selectionBox.y + selectionBox.height ||
               elemY + elemHeight < selectionBox.y);
    } else if (element.type === 'circle') {
      const centerX = element.x || 0;
      const centerY = element.y || 0;
      const radius = element.radius || 0;
      
      // Check if circle intersects with selection box
      const closestX = Math.max(selectionBox.x, Math.min(centerX, selectionBox.x + selectionBox.width));
      const closestY = Math.max(selectionBox.y, Math.min(centerY, selectionBox.y + selectionBox.height));
      const distance = Math.sqrt((centerX - closestX) ** 2 + (centerY - closestY) ** 2);
      return distance <= radius;
    } else if (element.type === 'text') {
      const textX = element.x || 0;
      const textY = element.y || 0;
      
      return textX >= selectionBox.x && textX <= selectionBox.x + selectionBox.width &&
             textY >= selectionBox.y && textY <= selectionBox.y + selectionBox.height;
    } else if (element.type === 'arrow') {
      const points = element.points || [];
      if (points.length >= 4) {
        const x1 = points[0], y1 = points[1], x2 = points[2], y2 = points[3];
        // Check if either endpoint is in selection
        return (x1 >= selectionBox.x && x1 <= selectionBox.x + selectionBox.width &&
                y1 >= selectionBox.y && y1 <= selectionBox.y + selectionBox.height) ||
               (x2 >= selectionBox.x && x2 <= selectionBox.x + selectionBox.width &&
                y2 >= selectionBox.y && y2 <= selectionBox.y + selectionBox.height);
      }
    }
    
    return false;
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedElements([]);
    setSelectionBox(null);
    if (transformerRef) {
      transformerRef.nodes([]);
    }
  };

  // Select elements in the selection box
  const selectElementsInBox = (box: SelectionBox) => {
    const selected: string[] = [];
    
    elements.forEach(element => {
      if (isElementInSelection(element, box)) {
        selected.push(element.id);
      }
    });
    
    setSelectedElements(selected);
    // The useEffect will handle updating the transformer
  };

  // Add helper function for distance calculation
  const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    
    if (param < 0) {
      param = 0;
    } else if (param > 1) {
      param = 1;
    }
    
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Improved element hit detection
  const getElementAtPosition = (worldPos: { x: number; y: number }): DrawingElement | null => {
    // Check elements in reverse order (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      
      if (el.type === 'rectangle') {
        const x = el.x || 0;
        const y = el.y || 0;
        const width = el.width || 0;
        const height = el.height || 0;
        if (worldPos.x >= x && worldPos.x <= x + width &&
            worldPos.y >= y && worldPos.y <= y + height) {
          return el;
        }
      } else if (el.type === 'circle') {
        const centerX = el.x || 0;
        const centerY = el.y || 0;
        const radius = el.radius || 0;
        const distance = Math.sqrt((worldPos.x - centerX) ** 2 + (worldPos.y - centerY) ** 2);
        if (distance <= radius) {
          return el;
        }
      } else if (el.type === 'text') {
        const x = el.x || 0;
        const y = el.y || 0;
        // Approximate text bounds
        const textWidth = (el.text || '').length * 12;
        const textHeight = 20;
        if (worldPos.x >= x && worldPos.x <= x + textWidth &&
            worldPos.y >= y && worldPos.y <= y + textHeight) {
          return el;
        }
      } else if (el.type === 'pen' || el.type === 'eraser') {
        const points = el.points || [];
        for (let j = 0; j < points.length - 2; j += 2) {
          const x1 = points[j];
          const y1 = points[j + 1];
          const x2 = points[j + 2];
          const y2 = points[j + 3];
          
          const distance = distanceToLineSegment(worldPos.x, worldPos.y, x1, y1, x2, y2);
          if (distance <= (el.strokeWidth || 2) + 5) {
            return el;
          }
        }
      } else if (el.type === 'arrow') {
        const points = el.points || [];
        if (points.length >= 4) {
          const distance = distanceToLineSegment(worldPos.x, worldPos.y, points[0], points[1], points[2], points[3]);
          if (distance <= (el.strokeWidth || 2) + 5) {
            return el;
          }
        }
      }
    }
    return null;
  };

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

  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      setElements(previousState.elements);
      setBackgroundColor(previousState.backgroundColor);
      if (previousState.viewport) {
        setViewport(previousState.viewport);
      }
      if (previousState.selectedElements) {
        setSelectedElements(previousState.selectedElements);
      }
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setElements(nextState.elements);
      setBackgroundColor(nextState.backgroundColor);
      if (nextState.viewport) {
        setViewport(nextState.viewport);
      }
      if (nextState.selectedElements) {
        setSelectedElements(nextState.selectedElements);
      }
    }
  }, [redo]);

  // Add useEffect to update transformer when selectedElements change
  useEffect(() => {
    if (transformerRef && stageRef.current) {
      if (selectedElements.length > 0) {
        const selectedNodes = selectedElements.map(id => {
          const node = stageRef.current!.findOne(`#${id}`);
          return node;
        }).filter(node => node);
        
        if (selectedNodes.length > 0) {
          transformerRef.nodes(selectedNodes);
          transformerRef.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.nodes([]);
        transformerRef.getLayer()?.batchDraw();
      }
    }
  }, [selectedElements, transformerRef, elements]); // Add this useEffect

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
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          // Select all
          const allIds = elements.map(el => el.id);
          setSelectedElements(allIds);
          // The useEffect above will handle updating the transformer
        }
      }
      
      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElements.length > 0) {
          const newElements = elements.filter(el => !selectedElements.includes(el.id));
          setElements(newElements);
          saveToHistory(newElements, backgroundColor, viewport, []);
          clearSelection();
        }
      }
      
      // Space bar for temporary pan
      if (e.code === 'Space' && tool !== 'pan' && !isPanning) {
        e.preventDefault();
        setTool('pan');
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && tool === 'pan') {
        setTool('select'); // Return to select tool when space is released
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, tool, isPanning, selectedElements, elements, backgroundColor, viewport, saveToHistory]);

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
          saveToHistory(newElements, backgroundColor, viewport, selectedElements);
        }
      }
    } catch (error) {
      console.error('Flood fill error:', error);
    }
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (!pointerPos) return;

    // Handle panning
    if (tool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    // Convert to world coordinates
    const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

    // Handle selection tool
    if (tool === 'select') {
      // Check if we clicked on the transformer or its handles
      const clickedOnTransformer = e.target.getClassName() === 'Transformer' || 
                                  e.target.getParent()?.getClassName() === 'Transformer';
      
      if (clickedOnTransformer) {
        // Don't clear selection when clicking on transformer
        return;
      }

      // Check if we clicked on the stage background (not on any element)
      const clickedOnStage = e.target === e.target.getStage();
      
      // Check if we clicked on any element
      const clickedElement = getElementAtPosition(worldPos);

      if (clickedElement) {
        // If element is already selected and we're clicking on it, don't change selection
        if (selectedElements.includes(clickedElement.id)) {
          // Element is already selected, allow dragging/transforming
          return;
        } else {
          // Select this element (clear others unless holding Ctrl/Cmd)
          if (e.evt && (e.evt.ctrlKey || e.evt.metaKey)) {
            // Add to selection
            setSelectedElements(prev => [...prev, clickedElement.id]);
          } else {
            // Replace selection
            setSelectedElements([clickedElement.id]);
          }
          // The useEffect will handle updating the transformer
          return;
        }
      } else {
        // Clicked on empty space
        if (clickedOnStage || e.target.getClassName() === 'Rect') {
          // If we have selected elements and clicked on empty space, clear selection
          if (selectedElements.length > 0) {
            clearSelection();
            return;
          }
        }
        
        // Start selection box
        setIsSelecting(true);
        setSelectionBox({
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0
        });
      }
      return;
    }

    // Clear selection when using other tools
    if (selectedElements.length > 0) {
      clearSelection();
    }

    if (textInput) {
      handleTextSubmit();
      return;
    }

    setIsDrawing(true);

    if (tool === 'pen' || tool === 'eraser') {
      const newElement: DrawingElement = {
        id: generateId(),
        type: tool,
        points: [worldPos.x, worldPos.y],
        stroke: tool === 'pen' ? currentColor : 'transparent',
        strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
        globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
      };
      setCurrentElement(newElement);
    } else if (tool === 'rectangle') {
      const newElement: DrawingElement = {
        id: generateId(),
        type: 'rectangle',
        x: worldPos.x,
        y: worldPos.y,
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
        x: worldPos.x,
        y: worldPos.y,
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
        points: [worldPos.x, worldPos.y, worldPos.x, worldPos.y],
        stroke: currentColor,
        strokeWidth,
      };
      setCurrentElement(newElement);
    } else if (tool === 'text') {
      const stage = stageRef.current;
      const container = containerRef.current;
      
      if (stage && container) {
        const containerRect = container.getBoundingClientRect();
        const screenX = containerRect.left + pointerPos.x;
        const screenY = containerRect.top + pointerPos.y;
        
        setTextInput({
          id: generateId(),
          x: screenX,
          y: screenY,
          text: ''
        });
      }
      setIsDrawing(false);
    } else if (tool === 'fill') {
      floodFill(worldPos.x, worldPos.y, currentColor);
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (!pointerPos) return;

    // Handle panning
    if (isPanning && tool === 'pan') {
      const deltaX = pointerPos.x - lastPanPoint.x;
      const deltaY = pointerPos.y - lastPanPoint.y;
      
      setViewport(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

    // Handle selection box
    if (isSelecting && selectionBox && tool === 'select') {
      const updatedBox = {
        ...selectionBox,
        width: worldPos.x - selectionBox.x,
        height: worldPos.y - selectionBox.y
      };
      setSelectionBox(updatedBox);
      return;
    }

    if (!isDrawing || !currentElement || tool === 'select') return;

    if (tool === 'pen' || tool === 'eraser') {
      const updatedElement = {
        ...currentElement,
        points: [...(currentElement.points || []), worldPos.x, worldPos.y],
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'rectangle') {
      const updatedElement = {
        ...currentElement,
        width: worldPos.x - (currentElement.x || 0),
        height: worldPos.y - (currentElement.y || 0),
      };
      setCurrentElement(updatedElement);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(worldPos.x - (currentElement.x || 0), 2) +
        Math.pow(worldPos.y - (currentElement.y || 0), 2)
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
          worldPos.x,
          worldPos.y,
        ],
      };
      setCurrentElement(updatedElement);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Handle selection box completion
    if (isSelecting && selectionBox && tool === 'select') {
      setIsSelecting(false);
      
      // Normalize selection box (handle negative width/height)
      const normalizedBox = {
        x: selectionBox.width < 0 ? selectionBox.x + selectionBox.width : selectionBox.x,
        y: selectionBox.height < 0 ? selectionBox.y + selectionBox.height : selectionBox.y,
        width: Math.abs(selectionBox.width),
        height: Math.abs(selectionBox.height)
      };
      
      if (normalizedBox.width > 1 && normalizedBox.height > 1) {
        selectElementsInBox(normalizedBox);
      }
      
      setSelectionBox(null);
      return;
    }

    if (currentElement && isDrawing && tool !== 'fill' && tool !== 'text' && tool !== 'select') {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      saveToHistory(newElements, backgroundColor, viewport, selectedElements);
    }
    setIsDrawing(false);
    setCurrentElement(null);
  };

  // Handle wheel zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };

    // Make zoom less sensitive
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Clamp scale between reasonable limits
    const clampedScale = Math.max(0.1, Math.min(3, newScale));

    setViewport({
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.text.trim()) {
      const stage = stageRef.current;
      const container = containerRef.current;
      
      if (stage && container) {
        const containerRect = container.getBoundingClientRect();
        const canvasX = textInput.x - containerRect.left;
        const canvasY = textInput.y - containerRect.top;
        const worldPos = screenToWorld(canvasX, canvasY);
        
        const newElement: DrawingElement = {
          id: textInput.id,
          type: 'text',
          x: worldPos.x,
          y: worldPos.y,
          text: textInput.text,
          fill: currentColor,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements, backgroundColor, viewport, selectedElements);
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
    saveToHistory(updatedElements, backgroundColor, viewport, selectedElements);
  };

  const clearCanvas = () => {
    const newElements: DrawingElement[] = [];
    const newBgColor = '#ffffff';
    setElements(newElements);
    setBackgroundColor(newBgColor);
    setSelectedElements([]);
    saveToHistory(newElements, newBgColor, viewport, []);
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
          cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : (tool === 'select' ? 'default' : 'crosshair'),
          overflow: 'hidden'
        }}
      >
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          ref={stageRef}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
        >
          <Layer>
            {/* Infinite grid background */}
            <Rect
              x={-10000}
              y={-10000}
              width={20000}
              height={20000}
              fill={backgroundColor}
              listening={false}
            />
            <CanvasElements
              elements={elements}
              currentElement={currentElement}
              tool={tool}
              canvasSize={canvasSize}
              onElementDragEnd={handleElementDragEnd}
              selectedElements={selectedElements}
            />
            
            {/* Selection box visual */}
            {selectionBox && tool === 'select' && (
              <Rect
                x={selectionBox.width < 0 ? selectionBox.x + selectionBox.width : selectionBox.x}
                y={selectionBox.height < 0 ? selectionBox.y + selectionBox.height : selectionBox.y}
                width={Math.abs(selectionBox.width)}
                height={Math.abs(selectionBox.height)}
                stroke="#3b82f6"
                strokeWidth={1 / viewport.scale}
                fill="rgba(59, 130, 246, 0.1)"
                dash={[5 / viewport.scale, 5 / viewport.scale]}
                listening={false}
              />
            )}
            
            {/* Transformer for selected elements */}
            <Transformer
              ref={(node) => setTransformerRef(node)}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit minimum size
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>
    </>
  );
};