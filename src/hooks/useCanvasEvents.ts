import { useCallback } from 'react';
import type { DrawingElement, Tool, SelectionBox } from '../types/canvas';
import { CanvasEventHandlers } from '../components/canvas/CanvasEventHandlers';

interface UseCanvasEventsProps {
  tool: Tool;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  currentElement: DrawingElement | null;
  setCurrentElement: (element: DrawingElement | null) => void;
  elements: DrawingElement[];
  setElements: (elements: DrawingElement[] | ((prev: DrawingElement[]) => DrawingElement[])) => void;
  viewport: { x: number; y: number; scale: number };
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;
  lastPanPoint: { x: number; y: number };
  setLastPanPoint: (point: { x: number; y: number }) => void;
  selection: { elements: string[]; box: SelectionBox | null; isActive: boolean };
  setSelection: (selection: { elements: string[]; box: SelectionBox | null; isActive: boolean }) => void;
  clearSelection: () => void;
  currentColor: string;
  strokeWidth: number;
  textInput: any;
  setTextInput: (input: any) => void;
  screenToWorld: (x: number, y: number) => { x: number; y: number };
  generateId: () => string;
  getElementAtPosition: (pos: { x: number; y: number }) => DrawingElement | null;
  isElementInSelection: (element: DrawingElement, box: SelectionBox) => boolean;
  emitDrawingStart: (element: DrawingElement) => void;
  emitDrawingUpdate: (element: DrawingElement) => void;
  emitDrawingEnd: (element: DrawingElement) => void;
  emitCursorMove: (x: number, y: number) => void;
  lastCursorUpdate: React.MutableRefObject<number>;
}

export const useCanvasEvents = (props: UseCanvasEventsProps) => {
  const {
    tool, isDrawing, setIsDrawing, isPanning, setIsPanning,
    currentElement, setCurrentElement, elements, setElements,
    viewport, setViewport, lastPanPoint, setLastPanPoint,
    selection, setSelection, clearSelection,
    currentColor, strokeWidth, textInput, setTextInput,
    screenToWorld, generateId, getElementAtPosition, isElementInSelection,
    emitDrawingStart, emitDrawingUpdate, emitDrawingEnd, emitCursorMove,
    lastCursorUpdate
  } = props;

  const handleMouseDown = useCallback((e: any) => {
    e.evt.preventDefault();
    if (textInput) return;
    const target = e.target;
    const isTransformerNode = target.getClassName && (
      target.getClassName() === 'Transformer' ||
      target.parent?.getClassName() === 'Transformer' ||
      target.hasName('_anchor') ||
      target.hasName('rotater')
    );

    if (isTransformerNode) {
      console.log('Clicked on transformer, letting it handle the event');
      return;
    }

    const pointerPos = e.target.getStage()?.getPointerPosition();
    if (!pointerPos) return;

    const worldPos = screenToWorld(pointerPos.x, pointerPos.y);
    // @ts-ignore
    if (tool === 'pan' || (tool !== 'pan' && e.evt.shiftKey)) {
      setIsPanning(true);
      setLastPanPoint({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    if (tool === 'select') {
      const clickedElement = getElementAtPosition(worldPos);
      
      if (clickedElement) {
        const isAlreadySelected = selection.elements.includes(clickedElement.id);
        
        if (e.evt.ctrlKey || e.evt.metaKey) {
          if (isAlreadySelected) {
            setSelection({
              ...selection,
              elements: selection.elements.filter(id => id !== clickedElement.id)
            });
          } else {
            setSelection({
              ...selection,
              elements: [...selection.elements, clickedElement.id]
            });
          }
        } else if (!isAlreadySelected) {
          setSelection({
            elements: [clickedElement.id],
            box: null,
            isActive: false
          });
        }
      } else {
        clearSelection();
        setSelection({
          elements: [],
          box: { x: worldPos.x, y: worldPos.y, width: 0, height: 0 },
          isActive: true
        });
        setIsDrawing(true);
      }
      return;
    }

    if (tool === 'text') {
      setTextInput({
        id: generateId(),
        x: pointerPos.x,
        y: pointerPos.y,
        text: ''
      });
      return;
    }

    clearSelection();

    const newElement = CanvasEventHandlers.createElementFromTool(
      tool,
      worldPos,
      currentColor,
      strokeWidth,
      generateId
    );

    if (newElement) {
      setCurrentElement(newElement);
      setIsDrawing(true);
      emitDrawingStart(newElement);
    }
  }, [
    tool, textInput, screenToWorld, setIsPanning, setLastPanPoint,
    getElementAtPosition, selection, setSelection, clearSelection,
    setTextInput, generateId, currentColor, strokeWidth,
    setCurrentElement, setIsDrawing, emitDrawingStart
  ]);

  const handleMouseMove = useCallback((e: any) => {
    const pointerPos = e.target.getStage()?.getPointerPosition();
    if (!pointerPos) return;

    const worldPos = screenToWorld(pointerPos.x, pointerPos.y);

    const now = Date.now();
    if (now - lastCursorUpdate.current > 50) {
      emitCursorMove(worldPos.x, worldPos.y); 
      lastCursorUpdate.current = now;
    }

    if (isPanning) {
      const deltaX = pointerPos.x - lastPanPoint.x;
      const deltaY = pointerPos.y - lastPanPoint.y;
      
      setViewport({
        ...viewport,
        x: viewport.x + deltaX,
        y: viewport.y + deltaY
      });
      
      setLastPanPoint({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    if (!isDrawing) return;

    if (tool === 'select' && selection.isActive && selection.box) {
      const startX = selection.box.startX ?? selection.box.x;
      const startY = selection.box.startY ?? selection.box.y;
      const endX = worldPos.x;
      const endY = worldPos.y;

      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      const newBox = { x, y, width, height, startX, startY };

      const selectedElements = elements
        .filter(element => isElementInSelection(element, newBox))
        .map(element => element.id);

      setSelection({
        elements: selectedElements,
        box: newBox,
        isActive: true
      });
      return;
    }

    if (currentElement) {
      const updatedElement = CanvasEventHandlers.updateElementFromTool(
        currentElement,
        tool,
        worldPos
      );
      
      setCurrentElement(updatedElement);
      emitDrawingUpdate(updatedElement);
    }
  }, [
    screenToWorld, lastCursorUpdate, emitCursorMove, isPanning,
    lastPanPoint, viewport, setViewport, setLastPanPoint,
    isDrawing, tool, selection, elements, isElementInSelection,
    setSelection, currentElement, setCurrentElement, emitDrawingUpdate
  ]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      if (tool === 'select' && selection.isActive) {
        setSelection({
          ...selection,
          box: null,
          isActive: false
        });
      } else if (currentElement) {
        setElements(prev => [...prev, currentElement]);
        emitDrawingEnd(currentElement);
        setCurrentElement(null);
      }
      
      setIsDrawing(false);
    }
  }, [
    isPanning, setIsPanning, isDrawing, tool, selection,
    setSelection, currentElement, setElements, emitDrawingEnd,
    setCurrentElement, setIsDrawing
  ]);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const oldScale = viewport.scale;
    const newScale = Math.max(0.1, Math.min(3, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy));

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale
    };

    setViewport({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    });
  }, [viewport, setViewport]);

  const handleElementTransform = useCallback((element: DrawingElement, newAttrs: any) => {
    setElements(prev => prev.map(el => el.id === element.id ? element : el));
    emitDrawingUpdate(element);
  }, [setElements, emitDrawingUpdate]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleElementTransform
  };
};