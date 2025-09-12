import React from 'react';
import { 
  Pen, 
  Eraser, 
  PaintBucket, 
  Square, 
  CircleIcon, 
  ArrowUpRight, 
  Type, 
  Undo2, 
  Redo2, 
  Trash2,
  MousePointer,
  Hand // Add Hand icon for pan
} from 'lucide-react';
import type { Tool } from '../../types/canvas';
import { COLOR_SWATCHES } from '../../types/canvas';
import { ColorPicker } from './ColorPicker';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  currentColor,
  setCurrentColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo
}) => {
  const tools = [
    { name: 'select' as Tool, icon: MousePointer },
    { name: 'pan' as Tool, icon: Hand },
    { name: 'pen' as Tool, icon: Pen },
    { name: 'eraser' as Tool, icon: Eraser },
    { name: 'fill' as Tool, icon: PaintBucket },
    { name: 'rectangle' as Tool, icon: Square },
    { name: 'circle' as Tool, icon: CircleIcon },
    { name: 'arrow' as Tool, icon: ArrowUpRight },
    { name: 'text' as Tool, icon: Type }
  ];

  const actions = [
    { onClick: onUndo, icon: Undo2, disabled: !canUndo, title: 'Undo' },
    { onClick: onRedo, icon: Redo2, disabled: !canRedo, title: 'Redo' },
    { onClick: onClear, icon: Trash2, disabled: false, title: 'Clear' }
  ];

  return (
    <div 
      style={{
        position: 'fixed',
        top: '0px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '0 0 24px 24px',
        border: '1px solid #e5e7eb',
        borderTop: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
        
        {/* Tools */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {tools.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setTool(name)}
              style={{
                padding: '8px',
                border: tool === name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                backgroundColor: tool === name ? '#3b82f6' : '#ffffff',
                color: tool === name ? '#ffffff' : '#000000',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={name}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '32px', backgroundColor: '#e5e7eb' }} />

        {/* Color Swatches & Picker */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                border: currentColor === color ? '2px solid #3b82f6' : '1px solid #ccc',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: currentColor === color ? '0 0 0 1px rgba(59, 130, 246, 0.3)' : 'none'
              }}
              title={color}
            />
          ))}

          <ColorPicker 
            currentColor={currentColor}
            onColorChange={setCurrentColor}
          />
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '32px', backgroundColor: '#e5e7eb' }} />

        {/* Stroke Width */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{strokeWidth}px</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '32px', backgroundColor: '#e5e7eb' }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {actions.map(({ onClick, icon: Icon, disabled, title }, index) => (
            <button
              key={index}
              onClick={onClick}
              disabled={disabled}
              style={{
                padding: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                color: disabled ? '#9ca3af' : '#000000',
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={title}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};