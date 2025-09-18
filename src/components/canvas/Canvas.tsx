import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';

import { useCanvasState } from '../../hooks/useCanvasState';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useCanvasEvents } from '../../hooks/useCanvasEvents';
import { useSocket } from '../../hooks/useSocket';

import { Toolbar } from './Toolbar';
import { TextInputOverlay } from './TextInput';
import { CanvasElements } from './CanvasElements';
import { UserCursors } from './UserCursors';
import { RoomHeader } from './RoomHeader';
import { VoiceChat } from '../VoiceChat';
import { SelectionBox } from './SelectionBox';
import { ElementTransformer } from './ElementTransformer';
import type { DrawingElement } from '../../types/canvas';

interface WhiteboardProps {
  roomId: string;
  userName: string;
  onLeaveRoom: () => void;
}

interface ElementTransformerProps {
  selectedElements: string[];
  elements: DrawingElement[];
  stageRef: React.RefObject<Konva.Stage | null>;
  onTransformEnd?: (element: DrawingElement, newAttrs: any) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ roomId, userName, onLeaveRoom }) => {
  const canvasState = useCanvasState();
  const {
    tool, setTool,
    elements, setElements,
    isDrawing, setIsDrawing,
    currentColor, setCurrentColor,
    strokeWidth, setStrokeWidth,
    currentElement, setCurrentElement,
    backgroundColor,
    textInput, setTextInput,
    viewport, setViewport,
    canvasSize, setCanvasSize,
    isPanning, setIsPanning,
    lastPanPoint, setLastPanPoint,
    selection, setSelection,
    clearSelection,
    connectedUsers, setConnectedUsers,
    currentUserId, setCurrentUserId,
    isConnected, setIsConnected,
    remoteElements, setRemoteElements,
    copied, setCopied,
    clearCanvas
  } = canvasState;

  const { screenToWorld, generateId, getElementAtPosition, isElementInSelection } = useCanvasInteraction({
    tool,
    viewport,
    elements,
    selection
  });

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCursorUpdate = useRef(0);

  const { socket, emitDrawingStart, emitDrawingUpdate, emitDrawingEnd, emitCursorMove, emitElementsDeleted } = useSocket({
    roomId,
    userName,
    onRoomState: (data) => {
      setElements(data.elements);
      setConnectedUsers(new Map(data.users.map((u: any) => [u.id, u])));
      setCurrentUserId(data.userId);
      setViewport(data.viewport);
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
      setRemoteElements(prev => prev.map(el => el.id === element.id ? element : el));
      setElements(prev => prev.map(el => el.id === element.id ? element : el));
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

  const canvasEvents = useCanvasEvents({
    tool, isDrawing, setIsDrawing, isPanning, setIsPanning,
    currentElement, setCurrentElement, elements, setElements,
    viewport, setViewport, lastPanPoint, setLastPanPoint,
    selection, setSelection, clearSelection,
    currentColor, strokeWidth, textInput, setTextInput,
    screenToWorld, generateId, getElementAtPosition, isElementInSelection,
    emitDrawingStart, emitDrawingUpdate, emitDrawingEnd, emitCursorMove,
    lastCursorUpdate
  });

  const deleteSelectedElements = useCallback(() => {
    if (selection.elements.length > 0) {
      setElements(prev => prev.filter(el => !selection.elements.includes(el.id)));
      clearSelection();
      emitElementsDeleted(selection.elements);
    }
  }, [selection.elements, emitElementsDeleted, clearSelection, setElements]);

  useKeyboardShortcuts({
    tool,
    setTool,
    isPanning,
    selectionElements: selection.elements,
    deleteSelectedElements,
    clearSelection
  });

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
  }, [setCanvasSize]);

  const handleCopyRoomLink = useCallback(() => {
    const roomUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId, setCopied]);

  const handleTextSubmit = useCallback(() => {
    if (textInput && textInput.text.trim()) {
      const worldPos = screenToWorld(textInput.x, textInput.y);
      const textElement = {
        id: textInput.id,
        type: 'text' as const,
        x: worldPos.x,
        y: worldPos.y,
        text: textInput.text,
        fill: currentColor,
        fontSize: 20
      };
      
      setElements(prev => [...prev, textElement]);
      emitDrawingEnd(textElement);
    }
    setTextInput(null);
  }, [textInput, screenToWorld, currentColor, setElements, emitDrawingEnd, setTextInput]);

  const allElements = [...elements, ...remoteElements];

  return (
    <>
      <RoomHeader
        roomId={roomId}
        connectedUsers={connectedUsers}
        isConnected={isConnected}
        copied={copied}
        onCopyRoomLink={handleCopyRoomLink}
        onLeaveRoom={onLeaveRoom}
      />

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
          onMouseDown={canvasEvents.handleMouseDown}
          onMouseMove={canvasEvents.handleMouseMove}
          onMouseUp={canvasEvents.handleMouseUp}
          onWheel={canvasEvents.handleWheel}
          ref={stageRef}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          listening={true}
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
              selectedElements={selection.elements}
              onElementDragEnd={(element, newPos) => {
                const updated = { ...element, x: newPos.x, y: newPos.y };
                setElements(prev => prev.map(el => el.id === element.id ? updated : el));
                emitDrawingUpdate(updated); 
              }}
            />

            <SelectionBox selectionBox={selection.box} />
            
            <ElementTransformer
              selectedElements={selection.elements}
              elements={allElements}
              stageRef={stageRef}
              onTransformEnd={canvasEvents.handleElementTransform}
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