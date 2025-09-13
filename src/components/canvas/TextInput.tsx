import React, { useRef, useEffect } from 'react';
import {  type TextInput as TextInputType } from '../../types/canvas';

interface TextInputProps {
  textInput: TextInputType;
  currentColor: string;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const TextInputOverlay: React.FC<TextInputProps> = ({
  textInput,
  currentColor,
  onTextChange,
  onSubmit,
  onCancel
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); 
    
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={textInput.text}
      onChange={(e) => onTextChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        left: `${textInput.x}px`,
        top: `${textInput.y}px`,
        color: currentColor
      }}
      className="fixed z-[10000] outline-none bg-white text-xl font-sans min-w-[200px] px-2 py-1 border-none"
      placeholder="Type here..."
    />
  );
};