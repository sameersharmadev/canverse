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
}

export const CanvasElements: React.FC<CanvasElementsProps> = ({
  elements,
  currentElement,
  tool,
  canvasSize,
  onElementDragEnd
}) => {
  const renderElement = (element: DrawingElement) => {
    const isDraggable = tool === 'select';
    
    const handleDragEnd = (e: any) => {
      if (onElementDragEnd) {
        const newPos = e.target.position();
        onElementDragEnd(element, newPos);
      }
    };

    switch (element.type) {
      case 'pen':
      case 'eraser':
        return (
          <Line
            key={element.id}
            points={element.points ?? []}
            stroke={element.type === 'eraser' ? '#000000' : element.stroke}
            strokeWidth={element.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation={element.globalCompositeOperation as any}
            draggable={isDraggable}
            onDragEnd={handleDragEnd}
          />
        );
      case 'rectangle':
        return (
          <Rect
            key={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            fill={element.fill}
            draggable={isDraggable}
            onDragEnd={handleDragEnd}
          />
        );
      case 'circle':
        return (
          <Circle
            key={element.id}
            x={element.x}
            y={element.y}
            radius={element.radius}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            fill={element.fill}
            draggable={isDraggable}
            onDragEnd={handleDragEnd}
          />
        );
      case 'arrow':
        return (
          <Arrow
            key={element.id}
            points={element.points}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            fill={element.stroke}
            draggable={isDraggable}
            onDragEnd={handleDragEnd}
          />
        );
      case 'text':
        return (
          <Text
            key={element.id}
            x={element.x}
            y={element.y}
            text={element.text}
            fontSize={20}
            fill={element.fill}
            draggable={isDraggable}
            onDragEnd={handleDragEnd}
          />
        );
      case 'fill':
        if (element.fillPath) {
          const img = new Image();
          img.src = element.fillPath;
          return (
            <Group key={element.id}>
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