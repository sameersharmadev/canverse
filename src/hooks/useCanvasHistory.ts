import { useState } from 'react';
import { type CanvasState, type DrawingElement } from '../types/canvas';

export const useCanvasHistory = () => {
  const [history, setHistory] = useState<CanvasState[]>([{ 
    elements: [], 
    backgroundColor: '#ffffff'
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [redoStack, setRedoStack] = useState<CanvasState[]>([]);

  const saveToHistory = (elements: DrawingElement[], backgroundColor: string) => {
    const newState: CanvasState = {
      elements: [...elements],
      backgroundColor
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
    setRedoStack([]);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const currentState = history[historyIndex];
      setRedoStack(prev => [currentState, ...prev]);
      
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      return history[newIndex];
    }
    return null;
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setRedoStack(prev => prev.slice(1));
      
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      return nextState;
    }
    return null;
  };

  return {
    saveToHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: redoStack.length > 0
  };
};