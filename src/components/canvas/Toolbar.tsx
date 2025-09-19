import React from 'react';
import { 
  Pen, 
  Eraser, 
  Square, 
  CircleIcon, 
  ArrowUpRight, 
  Type, 
  Trash2,
  MousePointer,
  Hand,
  Minus
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
  onClear: () => void;
  selectedElements: string[];
  onDelete: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  currentColor,
  setCurrentColor,
  strokeWidth,
  setStrokeWidth,
  selectedElements,
  onDelete
}) => {
  const tools = [
    { name: 'select' as Tool, icon: MousePointer, shortcut: 'V' },
    { name: 'pan' as Tool, icon: Hand, shortcut: 'W' },
    { name: 'pen' as Tool, icon: Pen, shortcut: 'P' },
    { name: 'eraser' as Tool, icon: Eraser, shortcut: 'E' },
    { name: 'line' as Tool, icon: Minus, shortcut: 'L' },
    { name: 'rectangle' as Tool, icon: Square, shortcut: 'R' },
    { name: 'circle' as Tool, icon: CircleIcon, shortcut: 'C' },
    { name: 'arrow' as Tool, icon: ArrowUpRight, shortcut: 'A' },
    { name: 'text' as Tool, icon: Type, shortcut: 'T' }
  ];

  const actions = [
    { onClick: onDelete, icon: Trash2, disabled: selectedElements.length === 0, title: 'Delete' }
  ];

  return (
    <div className="fixed top-1 left-1/2 transform -translate-x-1/2 z-[100] bg-white px-4 py-2 rounded-b-3xl border border-neutral-200 border-t-0">
      <div className="flex items-center gap-3 flex-nowrap">
        
        {/* Tools Section */}
        <div className="flex gap-1">
          {tools.map(({ name, icon: Icon, shortcut }) => (
            <button
              key={name}
              onClick={e => {
                setTool(name);
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              className={`
                relative p-3 rounded-lg cursor-pointer flex items-center justify-center transition-colors
                ${tool === name 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-white text-black hover:bg-gray-50'
                }
                focus:outline-none
              `}
              title={`${name.slice(0, 1).toUpperCase() + name.slice(1)} (${shortcut})`}
            >
              <Icon size={16} />
              <span className="absolute bottom-1 right-1 text-[8px] font-bold opacity-70 leading-none">
                {shortcut}
              </span>
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-300" />

        {/* Color Swatches Section */}
        <div className="flex gap-1.5 items-center">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`
                w-6 h-6 rounded-full cursor-pointer transition-all
                ${currentColor === color 
                  ? 'border-2 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]' 
                  : 'border border-gray-400'
                }
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}

          <ColorPicker 
            currentColor={currentColor}
            onColorChange={setCurrentColor}
          />
        </div>

        <div className="w-px h-8 bg-gray-300" />

        {/* Stroke Width Section */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{strokeWidth}px</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20"
          />
        </div>

        <div className="w-px h-8 bg-gray-300" />

        {/* Actions Section */}
        <div className="flex gap-1">
          {actions.map(({ onClick, icon: Icon, disabled, title }, index) => (
            <button
              key={index}
              onClick={onClick}
              disabled={disabled}
              className={`
                p-2 border border-gray-300 bg-white rounded-lg flex items-center justify-center transition-colors
                ${disabled 
                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                  : 'text-black cursor-pointer hover:bg-gray-50'
                }
              `}
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