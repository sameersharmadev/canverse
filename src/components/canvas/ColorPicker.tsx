import React, { useRef } from 'react';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, onColorChange }) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const openColorPicker = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={openColorPicker}
        className="w-9 h-9 border-none cursor-pointer bg-white flex items-center justify-center"
        title="Color Picker"
      >
        <Palette size={20} className="text-blue-500" />
      </button>
      
      <input
        ref={colorInputRef}
        type="color"
        value={currentColor}
        onChange={(e) => onColorChange(e.target.value)}
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
};