import React from 'react';
import { Line, Rect, Circle, Arrow, Text, Group } from 'react-konva';
import type { DrawingElement } from '../../types/canvas';
import { type Tool } from '../../types/canvas';

interface CanvasElementsProps {
  elements: DrawingElement[];
  currentElement: DrawingElement | null;
  tool: Tool;
  canvasSize: { width: number; height: number };
  onElementDragEnd?: (element: DrawingElement, newPosition: { x: number; y: number }) => void;
  selectedElements?: string[]; // Add selectedElements prop
}

export const CanvasElements: React.FC<CanvasElementsProps> = ({
  elements,
  currentElement,
  tool,
  canvasSize,
  onElementDragEnd,
  selectedElements = [] // Default to empty array
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

    // Prevent event propagation when dragging selected elements
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

    // Common props for all elements
    const commonProps = {
      id: element.id,
      draggable: isDraggable,
      onDragEnd: handleDragEnd,
      onDragStart: handleDragStart,
      onMouseDown: handleMouseDown,
      stroke: isSelected ? '#3b82f6' : element.stroke,
      strokeWidth: isSelected ? (element.strokeWidth || 1) + 2 : element.strokeWidth,
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
      case 'rectangle':
        return (
          <Rect
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill={element.fill}
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
            fill={element.fill}
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
            fontSize={20}
            fill={isSelected ? '#3b82f6' : element.fill}
            stroke={isSelected ? '#3b82f6' : undefined}
            strokeWidth={isSelected ? 1 : 0}
          />
        );
      case 'fill':
        if (element.fillPath) {
          const img = new Image();
          img.src = element.fillPath;
          return (
            <Group key={element.id} id={element.id}>
              <Rect
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                fillPatternImage={img}
                fillPatternRepeat="no-repeat"
                listening={false}
              />
            </Group>
          );
        }
        return (
          <Rect
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill={element.fill}
            listening={false}
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