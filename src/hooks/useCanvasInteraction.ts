import { useCallback } from 'react';
import type { DrawingElement, Tool, SelectionBox } from '../types/canvas';

interface UseCanvasInteractionProps {
  tool: Tool;
  viewport: { x: number; y: number; scale: number };
  elements: DrawingElement[];
  selection: {
    elements: string[];
    box: SelectionBox | null;
    isActive: boolean;
  };
}

export const useCanvasInteraction = ({
  tool,
  viewport,
  elements,
  selection
}: UseCanvasInteractionProps) => {
  
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale
    };
  }, [viewport]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const hitTesters = {
    rectangle: (element: DrawingElement, pos: { x: number; y: number }) => {
      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 0;
      const height = element.height || 0;
      return pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height;
    },
    circle: (element: DrawingElement, pos: { x: number; y: number }) => {
      const centerX = element.centerX || element.x || 0;
      const centerY = element.centerY || element.y || 0;
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

  const getElementAtPosition = useCallback((worldPos: { x: number; y: number }): DrawingElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const tester = hitTesters[el.type as keyof typeof hitTesters];
      if (tester && tester(el, worldPos)) {
        return el;
      }
    }
    return null;
  }, [elements]);

  const isElementInSelection = useCallback((element: DrawingElement, selectionBox: SelectionBox): boolean => {
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
      const centerX = element.centerX || element.x || 0;
      const centerY = element.centerY || element.y || 0;
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
  }, []);

  return {
    screenToWorld,
    generateId,
    getElementAtPosition,
    isElementInSelection
  };
};