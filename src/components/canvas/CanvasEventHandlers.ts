import type { DrawingElement, Tool } from '../../types/canvas';

export class CanvasEventHandlers {
  static createElementFromTool(
    tool: Tool,
    worldPos: { x: number; y: number },
    currentColor: string,
    strokeWidth: number,
    generateId: () => string
  ): DrawingElement | null {
    const baseElement = {
      id: generateId(),
      stroke: currentColor,
      strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
    };

    switch (tool) {
      case 'pen':
      case 'eraser':
        return {
          ...baseElement,
          type: tool,
          points: [worldPos.x, worldPos.y],
          stroke: tool === 'pen' ? currentColor : 'transparent',
          globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
        };
      case 'rectangle':
        return {
          ...baseElement,
          type: 'rectangle',
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
          fill: 'transparent',
        };
      case 'circle':
        return {
          ...baseElement,
          type: 'circle',
          startX: worldPos.x,
          startY: worldPos.y,
          x: worldPos.x,
          y: worldPos.y,
          radius: 0,
          fill: 'transparent',
        };
      case 'arrow':
      case 'line':
        return {
          ...baseElement,
          type: tool,
          points: [worldPos.x, worldPos.y, worldPos.x, worldPos.y],
        };
      default:
        return null;
    }
  }

  static updateElementFromTool(
    element: DrawingElement,
    tool: Tool,
    worldPos: { x: number; y: number }
  ): DrawingElement {
    switch (tool) {
      case 'pen':
      case 'eraser':
        return {
          ...element,
          points: [...(element.points || []), worldPos.x, worldPos.y],
        };
      case 'rectangle':
        return {
          ...element,
          width: worldPos.x - (element.x || 0),
          height: worldPos.y - (element.y || 0),
        };
      case 'circle': {
        const startX = element.startX ?? element.x ?? 0;
        const startY = element.startY ?? element.y ?? 0;
        const dx = worldPos.x - startX;
        const dy = worldPos.y - startY;
        const radius = Math.sqrt(dx * dx + dy * dy);

        return {
          ...element,
          x: startX,
          y: startY,
          radius,
          startX,
          startY
        };
      }
      case 'arrow':
      case 'line':
        return {
          ...element,
          points: [
            element.points![0],
            element.points![1],
            worldPos.x,
            worldPos.y,
          ],
        };
      default:
        return element;
    }
  }

  static handleSelectTool(
    worldPos: { x: number; y: number },
    selection: { isActive: boolean; box: { x: number; y: number; width: number; height: number } | null },
    elements: DrawingElement[],
    isElementInSelection: (element: DrawingElement, box: { x: number; y: number; width: number; height: number }) => boolean,
    setSelection: (selection: { elements: string[]; box: { x: number; y: number; width: number; height: number }; isActive: boolean }) => void
  ) {
    if (selection.isActive && selection.box) {
      const startX = selection.box.x;
      const startY = selection.box.y;
      const endX = worldPos.x;
      const endY = worldPos.y;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      const newBox = { x, y, width, height };

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
  }
}