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
        position: 'fixed',
        left: `${textInput.x}px`,
        top: `${textInput.y}px`,
        zIndex: 10000,
        border: '2px solid #3b82f6',
        outline: 'none',
        backgroundColor: '#ffffff',
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: currentColor,
        minWidth: '200px',
        padding: '4px 8px',
        border: 'none'
      }}
      placeholder="Type here..."
    />
  );
};