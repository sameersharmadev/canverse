import { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import { type DrawingElement, type Tool, type TextInput, type SelectionBox } from '../../types/canvas.ts';
import { Toolbar } from './Toolbar';
import { TextInputOverlay } from './TextInput.tsx';
import { CanvasElements } from './CanvasElements.tsx';
import { useSocket } from '../../hooks/useSocket'; 
import { UserCursors } from './UserCursors';
import { VoiceChat } from '../VoiceChat';
import { Copy, LogOut } from 'lucide-react';

interface WhiteboardProps {
  roomId: string;
  userName: string;
  onLeaveRoom: () => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ roomId, userName, onLeaveRoom }) => {
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

  // Selection state - unified
  const [selection, setSelection] = useState<{
    elements: string[];
    box: SelectionBox | null;
    isActive: boolean;
  }>({ elements: [], box: null, isActive: false });

  const [transformerRef, setTransformerRef] = useState<Konva.Transformer | null>(null);

  // Collaboration state
  const [connectedUsers, setConnectedUsers] = useState<Map<string, any>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [remoteElements, setRemoteElements] = useState<DrawingElement[]>([]);
  const [copied, setCopied] = useState(false);

  // Refs
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCursorUpdate = useRef(0);

  const {
    socket, 
    emitDrawingStart,
    emitDrawingUpdate,
    emitDrawingEnd,
    emitCursorMove,
    emitElementsDeleted
  } = useSocket({
    roomId,
    userName,
    onRoomState: (data) => {
      setElements(data.elements);
      setConnectedUsers(new Map(data.users.map((u: any) => [u.id, u])));
      setCurrentUserId(data.userId);
      setViewport(data.viewport);
      setBackgroundColor(data.backgroundColor);
      setIsConnected(true);
    },
    onUserJoined: (user) => {
      setConnectedUsers(prev => new Map(prev.set(user.id, user)));
    },
    onUserLeft: (userId) => {
      setConnectedUsers(prev => {
        const newUsers = new Map(prev);
        newUsers.delete(userId);
        return newUsers;
      });
    },
    onDrawingStart: (element) => {
      setRemoteElements(prev => [...prev, element]);
    },
    onDrawingUpdate: (element) => {
      setRemoteElements(prev => 
        prev.map(el => el.id === element.id ? element : el)
      );
      setElements(prev =>
        prev.map(el => el.id === element.id ? element : el)
      );
    },
    onDrawingEnd: (element) => {
      setElements(prev => [...prev.filter(el => el.id !== element.id), element]);
      setRemoteElements(prev => prev.filter(el => el.id !== element.id));
    },
    onCursorUpdate: ({ userId, x, y }) => {
      setConnectedUsers(prev => {
        const user = prev.get(userId);
        if (user) {
          return new Map(prev.set(userId, { ...user, cursor: { x, y } }));
        }
        return prev;
      });
    },
    onElementsDeleted: (elementIds) => {
      setElements(prev => prev.filter(el => !elementIds.includes(el.id)));
    }
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale
    };
  }, [viewport]);

  const emitCursorPosition = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorUpdate.current > 50) { 
      const worldPos = screenToWorld(x, y);
      emitCursorMove(worldPos.x, worldPos.y);
      lastCursorUpdate.current = now;
    }
  }, [emitCursorMove, screenToWorld]);

  // Hit detection utilities
  const hitTesters = {
    rectangle: (element: DrawingElement, pos: { x: number; y: number }) => {
      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 0;
      const height = element.height || 0;
      return pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height;
    },
    circle: (element: DrawingElement, pos: { x: number; y: number }) => {
      const centerX = element.x || 0;
      const centerY = element.y || 0;
      const radius = element.radius || 0;
      const distance = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
      return distance <= radius;
    },
    text: (element: DrawingElement, pos: { x: number; y: number }) => {
      const x = element.x || 0;
      const y = element.y || 0;
      const textWidth = (element.text || '').length * 12;
      const textHeight = 20;
      return pos.x >= x && pos.x <= x + textWidth && pos.y >= y && pos.y <= y + textHeight;
    },
    pen: (element: DrawingElement, pos: { x: number; y: number }) => {
      const points = element.points || [];
      for (let j = 0; j < points.length - 2; j += 2) {
        const distance = distanceToLineSegment(pos.x, pos.y, points[j], points[j + 1], points[j + 2], points[j + 3]);
        if (distance <= (element.strokeWidth || 2) + 5) return true;
      }
      return false;
    },
    eraser: (element: DrawingElement, pos: { x: number; y: number }) => hitTesters.pen(element, pos),
    line: (element: DrawingElement, pos: { x: number; y: number }) => hitTesters.pen(element, pos),
    arrow: (element: DrawingElement, pos: { x: number; y: number }) => {
      const points = element.points || [];
      if (points.length >= 4) {
        const distance = distanceToLineSegment(pos.x, pos.y, points[0], points[1], points[2], points[3]);
        return distance <= (element.strokeWidth || 2) + 5;
      }
      return false;
    }
  };

  const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    let param = Math.max(0, Math.min(1, dot / lenSq));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const getElementAtPosition = (worldPos: { x: number; y: number }): DrawingElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const tester = hitTesters[el.type as keyof typeof hitTesters];
      if (tester && tester(el, worldPos)) {
        return el;
      }
    }
    return null;
  };

  const isElementInSelection = (element: DrawingElement, selectionBox: SelectionBox): boolean => {
    if (element.type === 'pen' || element.type === 'eraser' || element.type === 'line') {
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
    setSelection({ elements: [], box: null, isActive: false });
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
    setSelection(prev => ({ ...prev, elements: selected }));
  };

  // Canvas size effect
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setCanvasSize({ width: clientWidth, height: clientHeight });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const deleteSelectedElements = useCallback(() => {
    if (selection.elements.length > 0) {
      setElements(prev => prev.filter(el => !selection.elements.includes(el.id)));
      clearSelection();
      emitElementsDeleted(selection.elements); 
    }
  }, [selection.elements, emitElementsDeleted]);

  // Transformer effect
  useEffect(() => {
    if (transformerRef && stageRef.current) {
      if (selection.elements.length > 0) {
        const selectedNodes = selection.elements.map(id => 
          stageRef.current!.findOne(`#${id}`)
        ).filter((node): node is Konva.Node => !!node);

        if (selectedNodes.length > 0) {
          transformerRef.nodes(selectedNodes);
          transformerRef.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.nodes([]);
        transformerRef.getLayer()?.batchDraw();
      }
    }
  }, [selection.elements, transformerRef, elements]);

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.elements.length > 0) {
        e.preventDefault();
        deleteSelectedElements();
      }

      if (e.code === 'Space' && tool !== 'pan' && !isPanning) {
        e.preventDefault();
        setTool('pan');
      }

      if (e.key === 'Escape') {
        clearSelection();
      }

      const toolShortcuts: { [key: string]: Tool } = {
        'v': 'select', 'w': 'pan', 'p': 'pen', 'e': 'eraser',
        'l': 'line', 'r': 'rectangle', 'c': 'circle', 'a': 'arrow', 't': 'text'
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
  }, [tool, isPanning, selection.elements, deleteSelectedElements]);

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
      if (clickedOnTransformer) return;

      const clickedElement = getElementAtPosition(worldPos);

      if (clickedElement) {
        if (selection.elements.includes(clickedElement.id)) return;
        
        if (e.evt && (e.evt.ctrlKey || e.evt.metaKey)) {
          setSelection(prev => ({ 
            ...prev, 
            elements: [...prev.elements, clickedElement.id] 
          }));
        } else {
          setSelection(prev => ({ ...prev, elements: [clickedElement.id] }));
        }
        return;
      } else {
        const clickedOnStage = e.target === e.target.getStage();
        if (clickedOnStage || e.target.getClassName() === 'Rect') {
          if (selection.elements.length > 0) {
            clearSelection();
            return;
          }
        }

        setSelection(prev => ({
          ...prev,
          isActive: true,
          box: { x: worldPos.x, y: worldPos.y, width: 0, height: 0 }
        }));
      }
      return;
    }

    if (selection.elements.length > 0) {
      clearSelection();
    }

    if (textInput) {
      handleTextSubmit();
      return;
    }

    setIsDrawing(true);

    // Create new element based on tool
    const baseElement = {
      id: generateId(),
      stroke: currentColor,
      strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
    };

    let newElement: DrawingElement;

    switch (tool) {
      case 'pen':
      case 'eraser':
        newElement = {
          ...baseElement,
          type: tool,
          points: [worldPos.x, worldPos.y],
          stroke: tool === 'pen' ? currentColor : 'transparent',
          globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
        };
        break;
      case 'rectangle':
        newElement = {
          ...baseElement,
          type: 'rectangle',
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
          fill: 'transparent',
        };
        break;
      case 'circle':
        newElement = {
          ...baseElement,
          type: 'circle',
          x: worldPos.x,
          y: worldPos.y,
          radius: 0,
          fill: 'transparent',
        };
        break;
      case 'arrow':
      case 'line':
        newElement = {
          ...baseElement,
          type: tool,
          points: [worldPos.x, worldPos.y, worldPos.x, worldPos.y],
        };
        break;
      case 'text':
        const stage = stageRef.current;
        const container = containerRef.current;
        if (stage && container) {
          const containerRect = container.getBoundingClientRect();
          const screenX = containerRect.left + pointerPos.x;
          const screenY = containerRect.top + pointerPos.y;
          setTextInput({ id: generateId(), x: screenX, y: screenY, text: '' });
        }
        setIsDrawing(false);
        return;
      default:
        return;
    }

    setCurrentElement(newElement);
    emitDrawingStart(newElement);
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    emitCursorPosition(pointerPos.x, pointerPos.y);

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

    if (selection.isActive && selection.box && tool === 'select') {
      setSelection(prev => ({
        ...prev,
        box: prev.box ? {
          ...prev.box,
          width: worldPos.x - prev.box.x,
          height: worldPos.y - prev.box.y
        } : null
      }));
      return;
    }

    if (!isDrawing || !currentElement || tool === 'select') return;

    let updatedElement: DrawingElement;

    switch (tool) {
      case 'pen':
      case 'eraser':
        updatedElement = {
          ...currentElement,
          points: [...(currentElement.points || []), worldPos.x, worldPos.y],
        };
        break;
      case 'rectangle':
        updatedElement = {
          ...currentElement,
          width: worldPos.x - (currentElement.x || 0),
          height: worldPos.y - (currentElement.y || 0),
        };
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(worldPos.x - (currentElement.x || 0), 2) +
          Math.pow(worldPos.y - (currentElement.y || 0), 2)
        );
        updatedElement = { ...currentElement, radius };
        break;
      case 'arrow':
      case 'line':
        updatedElement = {
          ...currentElement,
          points: [
            currentElement.points![0],
            currentElement.points![1],
            worldPos.x,
            worldPos.y,
          ],
        };
        break;
      default:
        return;
    }

    setCurrentElement(updatedElement);
    emitDrawingUpdate(updatedElement);
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (selection.isActive && selection.box && tool === 'select') {
      const box = selection.box;
      const normalizedBox = {
        x: box.width < 0 ? box.x + box.width : box.x,
        y: box.height < 0 ? box.y + box.height : box.y,
        width: Math.abs(box.width),
        height: Math.abs(box.height)
      };

      if (normalizedBox.width > 1 && normalizedBox.height > 1) {
        selectElementsInBox(normalizedBox);
      }

      setSelection(prev => ({ ...prev, box: null, isActive: false }));
      return;
    }

    if (currentElement && isDrawing && tool !== 'text' && tool !== 'select') {
      setElements(prev => [...prev, currentElement]);
      emitDrawingEnd(currentElement);
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
          fontSize: 20, 
        };
        setElements(prev => [...prev, newElement]);
        emitDrawingEnd(newElement);
      }
    }
    setTextInput(null);
  };

  const handleElementDragEnd = (element: DrawingElement, newPosition: { x: number; y: number }) => {
    const updatedElement = { ...element, x: newPosition.x, y: newPosition.y };
    setElements(prev => prev.map(el => el.id === element.id ? updatedElement : el));
    emitDrawingUpdate(updatedElement);
  };

  const clearCanvas = () => {
    setElements([]);
    setBackgroundColor('#ffffff');
    clearSelection();
  };

  const roomUrl = `${window.location.origin}?room=${roomId}`;

  const handleCopyRoomLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userList = Array.from(connectedUsers.values());
  const displayedUsers = userList.slice(0, 3);
  const extraUsersCount = Math.max(0, userList.length - 3);

  // Combined elements for rendering
  const allElements = [...elements, ...remoteElements];

  return (
    <>
      <div className="fixed top-2 left-5 z-[10001] bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 flex items-center gap-3 font-inter text-sm font-medium">
        <span
          className="text-gray-800 cursor-pointer select-none transition-all duration-200 hover:text-blue-600"
          title="Click to copy room link"
          onClick={handleCopyRoomLink}
        >
          Room: <span className="text-blue-600 font-bold font-mono bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-0.5 rounded-md cursor-pointer">{roomId}</span>
        </span>
        
        <button
          onClick={handleCopyRoomLink}
          className="bg-transparent border-none rounded-lg p-1.5 cursor-pointer flex items-center transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
          title={copied ? "Copied!" : "Copy room link"}
        >
          <Copy size={16} />
        </button>
      </div>

      <div className="fixed top-2 right-5 z-[10001] bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 flex items-center gap-3 font-inter">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center">
              {displayedUsers.map((user) => (
                <div
                  key={user.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  style={{ backgroundColor: user.color || '#6b7280' }}
                  title={user.name}
                >
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              ))}
              {extraUsersCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                  +{extraUsersCount}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-600 font-medium ml-1">
              {isConnected ? `${connectedUsers.size} online` : 'Connecting...'}
            </span>
          </div>
        </div>
        
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
        
        <button
          onClick={onLeaveRoom}
          className="bg-transparent border-none rounded-lg p-1.5 cursor-pointer flex items-center transition-all duration-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
          title="Leave room"
        >
          <LogOut size={16} />
        </button>
      </div>

      <Toolbar
        tool={tool}
        setTool={setTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        selectedElements={selection.elements}
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
        className={`fixed top-0 left-0 w-screen h-screen bg-gray-50 overflow-hidden ${
          tool === 'pan' 
            ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') 
            : (tool === 'select' ? 'cursor-default' : 'cursor-crosshair')
        }`}
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
              elements={allElements}
              currentElement={currentElement}
              tool={tool}
              canvasSize={canvasSize}
              onElementDragEnd={handleElementDragEnd}
              selectedElements={selection.elements}
            />

            {selection.box && tool === 'select' && (
              <Rect
                x={selection.box.width < 0 ? selection.box.x + selection.box.width : selection.box.x}
                y={selection.box.height < 0 ? selection.box.y + selection.box.height : selection.box.y}
                width={Math.abs(selection.box.width)}
                height={Math.abs(selection.box.height)}
                stroke="#6366f1"
                strokeWidth={1 / viewport.scale}
                fill="rgba(99, 102, 241, 0.08)"
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
              onTransformEnd={() => {
                const nodes = transformerRef?.nodes() || [];
                nodes.forEach(node => {
                  const id = node.id();
                  const element = elements.find(el => el.id === id);
                  if (!element) return;

                  let updatedElement = { ...element };

                  if (element.type === 'rectangle') {
                    updatedElement = {
                      ...element,
                      x: node.x(),
                      y: node.y(),
                      width: node.width() * node.scaleX(),
                      height: node.height() * node.scaleY(),
                    };
                  } else if (element.type === 'circle') {
                    updatedElement = {
                      ...element,
                      x: node.x(),
                      y: node.y(),
                      radius: (node.width() * node.scaleX()) / 2,
                    };
                  } else if (element.type === 'line' || element.type === 'arrow') {
                    updatedElement = {
                      ...element,
                      points: node.getAttr('points') ?? element.points,
                    };
                  } else if (element.type === 'text') {
                    updatedElement = {
                      ...element,
                      x: node.x(),
                      y: node.y(),
                      width: node.width() * node.scaleX(),
                      height: node.height() * node.scaleY(),
                      fontSize: Math.max(12, node.height() * node.scaleY()),
                    };
                  }

                  node.scaleX(1);
                  node.scaleY(1);

                  setElements(prev => prev.map(el => el.id === id ? updatedElement : el));
                  emitDrawingUpdate(updatedElement);
                });
              }}
            />
          </Layer>

          <UserCursors 
            users={connectedUsers}
            currentUserId={currentUserId}
            viewport={viewport}
          />
        </Stage>
      </div>

      <VoiceChat
        socket={socket}
        roomId={roomId}
        userId={currentUserId}
        userName={userName}
        userColor={connectedUsers.get(currentUserId)?.color || '#6b7280'}
        isConnected={isConnected}
      />
    </>
  );
};