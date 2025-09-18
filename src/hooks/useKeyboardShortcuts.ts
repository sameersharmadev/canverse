import { useEffect } from 'react';
import type { Tool } from '../types/canvas';

interface UseKeyboardShortcutsProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  isPanning: boolean;
  selectionElements: string[];
  deleteSelectedElements: () => void;
  clearSelection: () => void;
}

export const useKeyboardShortcuts = ({
  tool,
  setTool,
  isPanning,
  selectionElements,
  deleteSelectedElements,
  clearSelection
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectionElements.length > 0) {
        e.preventDefault();
        deleteSelectedElements();
      }

      if (e.code === 'Space' && tool !== 'pan' && !isPanning) {
        e.preventDefault();
        setTool('pan');
      }

      if (e.key === 'Escape') {
        clearSelection();
      }

      const toolShortcuts: { [key: string]: Tool } = {
        'v': 'select', 'w': 'pan', 'p': 'pen', 'e': 'eraser',
        'l': 'line', 'r': 'rectangle', 'c': 'circle', 'a': 'arrow', 't': 'text'
      };

      const shortcutTool = toolShortcuts[e.key.toLowerCase()];
      if (shortcutTool) {
        e.preventDefault();
        setTool(shortcutTool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && tool === 'pan') {
        setTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tool, isPanning, selectionElements, deleteSelectedElements, clearSelection, setTool]);
};