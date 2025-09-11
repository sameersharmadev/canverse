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
    <div style={{ position: 'relative' }}>
      <button
        onClick={openColorPicker}
        style={{
          width: '36px',
          height: '36px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Color Picker"
      >
        <Palette size={20} color="#3b82f6" />
      </button>
      
      <input
        ref={colorInputRef}
        type="color"
        value={currentColor}
        onChange={(e) => onColorChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer'
        }}
      />
    </div>
  );
};