import React from 'react';
import { Line, Rect, Circle, Arrow, Text } from 'react-konva';
import type { DrawingElement } from '../../types/canvas';
import { type Tool } from '../../types/canvas';

interface CanvasElementsProps {
  elements: DrawingElement[];
  currentElement: DrawingElement | null;
  tool: Tool;
  canvasSize: { width: number; height: number };
  onElementDragEnd?: (element: DrawingElement, newPosition: { x: number; y: number }) => void;
  selectedElements?: string[];
}

export const CanvasElements: React.FC<CanvasElementsProps> = ({
  elements,
  currentElement,
  tool,
  onElementDragEnd,
  selectedElements = []
}) => {
  const renderElement = (element: DrawingElement) => {
    const isDraggable = tool === 'select';
    const isSelected = selectedElements.includes(element.id);
    
    const handleDragEnd = (e: any) => {
      if (onElementDragEnd) {
        const newPos = e.target.position();
        onElementDragEnd(element, newPos);
      }
    };

    const handleDragStart = (e: any) => {
      if (isSelected && tool === 'select') {
        e.evt.stopPropagation();
      }
    };

    const handleMouseDown = (e: any) => {
      if (isSelected && tool === 'select') {
        e.evt.stopPropagation();
      }
    };

    const commonProps = {
      id: element.id, 
      draggable: isDraggable,
      onDragEnd: handleDragEnd,
      onDragStart: handleDragStart,
      onMouseDown: handleMouseDown,
      stroke: isSelected ? '#3b82f6' : element.stroke,
      strokeWidth: isSelected ? (element.strokeWidth || 1) + 2 : element.strokeWidth,
      fill: element.fill,
      listening: tool === 'select',
    };

    switch (element.type) {
      case 'pen':
      case 'eraser':
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={element.points ?? []}
            stroke={element.type === 'eraser' ? '#000000' : (isSelected ? '#3b82f6' : element.stroke)}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation={element.globalCompositeOperation as any}
          />
        );
      case 'line':
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={element.points ?? []}
            lineCap="round"
            lineJoin="round"
          />
        );
      case 'rectangle':
        return (
          <Rect
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
          />
        );
      case 'circle':
        return (
          <Circle
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            radius={element.radius}
          />
        );
      case 'arrow':
        return (
          <Arrow
            key={element.id}
            {...commonProps}
            points={element.points ?? []}
            fill={isSelected ? '#3b82f6' : element.stroke}
          />
        );
      case 'text':
        return (
          <Text
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            text={element.text}
            fill={element.fill}
            fontSize={element.fontSize || 20} 
            stroke={isSelected ? '#3b82f6' : undefined}
            strokeWidth={isSelected ? 1 : 0}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {elements.map(renderElement)}
      {currentElement && renderElement(currentElement)}
    </>
  );
};