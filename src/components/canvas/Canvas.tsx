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

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [transformerRef, setTransformerRef] = useState<Konva.Transformer | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { saveToHistory, undo, redo, canUndo, canRedo } = useCanvasHistory();

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale
    };
  }, [viewport]);

  const isElementInSelection = (element: DrawingElement, selectionBox: SelectionBox): boolean => {
    if (element.type === 'pen' || element.type === 'eraser') {
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

      return !(elemX > selectionBox.x + selectionBox.width ||
        elemX + elemWidth < selectionBox.x ||
        elemY > selectionBox.y + selectionBox.height ||
        elemY + elemHeight < selectionBox.y);
    } else if (element.type === 'circle') {
      const centerX = element.x || 0;
      const centerY = element.y || 0;
      const radius = element.radius || 0;

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
        return (x1 >= selectionBox.x && x1 <= selectionBox.x + selectionBox.width &&
          y1 >= selectionBox.y && y1 <= selectionBox.y + selectionBox.height) ||
          (x2 >= selectionBox.x && x2 <= selectionBox.x + selectionBox.width &&
            y2 >= selectionBox.y && y2 <= selectionBox.y + selectionBox.height);
      }
    }

    return false;
  };

  const clearSelection = () => {
    setSelectedElements([]);
    setSelectionBox(null);
    if (transformerRef) {
      transformerRef.nodes([]);
    }
  };

  const selectElementsInBox = (box: SelectionBox) => {
    const selected: string[] = [];

    elements.forEach(element => {
      if (isElementInSelection(element, box)) {
        selected.push(element.id);
      }
    });

    setSelectedElements(selected);
  };

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

  const getElementAtPosition = (worldPos: { x: number; y: number }): DrawingElement | null => {
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

  const deleteSelectedElements = useCallback(() => {
    if (selectedElements.length > 0) {
      const newElements = elements.filter(el => !selectedElements.includes(el.id));
      setElements(newElements);
      saveToHistory(newElements, backgroundColor, viewport, []);
      clearSelection();
    }
  }, [selectedElements, elements, backgroundColor, viewport, saveToHistory]);

  useEffect(() => {
    if (transformerRef && stageRef.current) {
      if (selectedElements.length > 0) {
        const selectedNodes = selectedElements.map(id => {
          const node = stageRef.current!.findOne(`#${id}`);
          return node;
        }).filter((node): node is Konva.Node => !!node);

        if (selectedNodes.length > 0) {
          transformerRef.nodes(selectedNodes);
          transformerRef.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.nodes([]);
        transformerRef.getLayer()?.batchDraw();
      }
    }
  }, [selectedElements, transformerRef, elements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === 'Z') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          const allIds = elements.map(el => el.id);
          setSelectedElements(allIds);
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElements.length > 0) {
          e.preventDefault();
          deleteSelectedElements();
        }
      }

      if (e.code === 'Space' && tool !== 'pan' && !isPanning) {
        e.preventDefault();
        setTool('pan');
      }

      if (e.key === 'Escape') {
        clearSelection();
      }

      const toolShortcuts: { [key: string]: Tool } = {
        'v': 'select',
        'w': 'pan',
        'p': 'pen',
        'e': 'eraser',
        'r': 'rectangle',
        'c': 'circle',
        'a': 'arrow',
        't': 'text'
      };

      const shortcutTool = toolShortcuts[e.key.toLowerCase()];
      if (shortcutTool) {
        e.preventDefault();
        setTool(shortcutTool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && tool === 'pan') {
        setTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, tool, isPanning, selectedElements, elements, backgroundColor, viewport, saveToHistory, deleteSelectedElements]);

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();

    if (!pointerPos) return;

    if (tool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

    if (tool === 'select') {
      const clickedOnTransformer = e.target.getClassName() === 'Transformer' ||
        e.target.getParent()?.getClassName() === 'Transformer';

      if (clickedOnTransformer) {
        return;
      }

      const clickedOnStage = e.target === e.target.getStage();

      const clickedElement = getElementAtPosition(worldPos);

      if (clickedElement) {
        if (selectedElements.includes(clickedElement.id)) {
          return;
        } else {
          if (e.evt && (e.evt.ctrlKey || e.evt.metaKey)) {
            setSelectedElements(prev => [...prev, clickedElement.id]);
          } else {
            setSelectedElements([clickedElement.id]);
          }
          return;
        }
      } else {
        if (clickedOnStage || e.target.getClassName() === 'Rect') {
          if (selectedElements.length > 0) {
            clearSelection();
            return;
          }
        }

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
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();

    if (!pointerPos) return;

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

    if (isSelecting && selectionBox && tool === 'select') {
      setIsSelecting(false);

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

    if (currentElement && isDrawing && tool !== 'text' && tool !== 'select') {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      saveToHistory(newElements, backgroundColor, viewport, selectedElements);
    }
    setIsDrawing(false);
    setCurrentElement(null);
  };

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

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

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
        canUndo={canUndo}
        canRedo={canRedo}
        selectedElements={selectedElements}
        onDelete={deleteSelectedElements}
        onClear={clearCanvas}
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

            <Transformer
              ref={(node) => setTransformerRef(node)}
              boundBoxFunc={(oldBox, newBox) => {
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