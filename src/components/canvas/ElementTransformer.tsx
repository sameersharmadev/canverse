import React, { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import Konva from 'konva';
import type { DrawingElement } from '../../types/canvas';

interface ElementTransformerProps {
  selectedElements: string[];
  elements: DrawingElement[];
  stageRef: React.RefObject<Konva.Stage>;
  onTransformEnd?: (element: DrawingElement, newAttrs: any) => void;
}

export const ElementTransformer: React.FC<ElementTransformerProps> = ({
  selectedElements,
  elements,
  stageRef,
  onTransformEnd
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
    if (!transformer || !stage) return;

    if (selectedElements.length === 0) {
      transformer.nodes([]);
      return;
    }

    const selectedNodes: Konva.Node[] = [];
    
    selectedElements.forEach(elementId => {
      const node = stage.findOne(`#${elementId}`);
      if (node) {
        selectedNodes.push(node);
      }
    });

    transformer.nodes(selectedNodes);
    const layer = transformer.getLayer();
    if (layer) {
      layer.batchDraw();
    }
  }, [selectedElements, elements, stageRef]);

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const elementId = node.id();
    
    if (!elementId || !onTransformEnd) return;

    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const newAttrs = {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
      skewX: node.skewX(),
      skewY: node.skewY()
    };

    let updatedElement: DrawingElement;

    switch (element.type) {
      case 'rectangle':
        updatedElement = {
          ...element,
          x: newAttrs.x,
          y: newAttrs.y,
          width: (element.width || 0) * newAttrs.scaleX,
          height: (element.height || 0) * newAttrs.scaleY
        };
        node.scaleX(1);
        node.scaleY(1);
        break;

      case 'circle':
        updatedElement = {
          ...element,
          x: newAttrs.x,
          y: newAttrs.y,
          radius: (element.radius || 0) * Math.max(newAttrs.scaleX, newAttrs.scaleY)
        };
        node.scaleX(1);
        node.scaleY(1);
        break;

      case 'text':
        updatedElement = {
          ...element,
          x: newAttrs.x,
          y: newAttrs.y,
          fontSize: (element.fontSize || 20) * newAttrs.scaleY
        };
        node.scaleX(1);
        node.scaleY(1);
        break;

      case 'pen':
      case 'eraser':
      case 'line':
      case 'arrow':
        if (element.points) {
          const transformedPoints = element.points.map((point, index) => {
            if (index % 2 === 0) {
              return (point - (element.x || 0)) * newAttrs.scaleX + newAttrs.x;
            } else {
              return (point - (element.y || 0)) * newAttrs.scaleY + newAttrs.y;
            }
          });

          updatedElement = {
            ...element,
            points: transformedPoints,
            strokeWidth: (element.strokeWidth || 1) * Math.max(newAttrs.scaleX, newAttrs.scaleY)
          };
        } else {
          updatedElement = element;
        }
        node.x(0);
        node.y(0);
        node.scaleX(1);
        node.scaleY(1);
        break;

      default:
        updatedElement = {
          ...element,
          x: newAttrs.x,
          y: newAttrs.y
        };
    }

    onTransformEnd(updatedElement, newAttrs);
  };

  const handleMouseDown = (e: any) => {
    e.cancelBubble = true;
  };

  return (
    <Transformer
      ref={transformerRef}
      rotateAnchorOffset={20}
      rotationSnaps={[0, 90, 180, 270]}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 10 || newBox.height < 10) {
          return oldBox;
        }
        return newBox;
      }}
      onTransformEnd={handleTransformEnd}
      onMouseDown={handleMouseDown}
      borderStroke="#3b82f6"
      borderStrokeWidth={1}
      anchorFill="#3b82f6"
      anchorStroke="#ffffff"
      anchorStrokeWidth={1}
      anchorSize={8}
      anchorCornerRadius={2}
      listening={true}
      draggable={false}
    />
  );
};