
import { useCallback, useEffect, useRef } from 'react';
import { GameEngine } from '../../../game/engine/GameEngine';

interface UseCursorManagementProps {
  gameEngine: GameEngine | null;
  isAnyUIOpen: () => boolean;
}

export const useCursorManagement = ({ gameEngine, isAnyUIOpen }: UseCursorManagementProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Force cursor visibility immediately when UI opens
  const forceCursorVisible = useCallback(() => {
    console.log('🖱️ [useCursorManagement] Forcing cursor to be visible and usable');
    
    // Apply multiple CSS properties to ensure cursor visibility
    const cursorStyles = {
      cursor: 'auto !important',
      pointerEvents: 'auto !important'
    };
    
    // Apply to body
    Object.assign(document.body.style, cursorStyles);
    
    // Apply to mount element
    if (mountRef.current) {
      Object.assign(mountRef.current.style, cursorStyles);
    }
    
    // Apply to canvas if it exists
    if (gameEngine) {
      const renderer = gameEngine.getRenderer();
      if (renderer && renderer.domElement) {
        Object.assign(renderer.domElement.style, cursorStyles);
      }
    }
    
    // Force immediate pointer lock exit as fallback
    try {
      if (document.pointerLockElement) {
        console.log('🖱️ [useCursorManagement] Forcing document.exitPointerLock() as fallback');
        document.exitPointerLock();
      }
    } catch (error) {
      console.warn('🖱️ [useCursorManagement] Fallback pointer lock exit failed:', error);
    }
    
    // Log current computed cursor style for debugging
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(document.body);
      console.log('🖱️ [useCursorManagement] Current cursor style:', computedStyle.cursor);
      console.log('🖱️ [useCursorManagement] Current pointer events:', computedStyle.pointerEvents);
    }, 100);
  }, [gameEngine]);

  const resetCursorForGame = useCallback(() => {
    console.log('🖱️ [useCursorManagement] Resetting cursor for game mode');
    
    // Reset cursor styles for game mode
    document.body.style.cursor = '';
    document.body.style.pointerEvents = '';
    
    if (mountRef.current) {
      mountRef.current.style.cursor = '';
      mountRef.current.style.pointerEvents = '';
    }
    
    // Reset canvas cursor if it exists
    if (gameEngine) {
      const renderer = gameEngine.getRenderer();
      if (renderer && renderer.domElement) {
        renderer.domElement.style.cursor = '';
        renderer.domElement.style.pointerEvents = '';
      }
    }
  }, [gameEngine]);

  // Listen for pointer lock changes
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;
      console.log('🔒 [useCursorManagement] Pointer lock changed:', isLocked);
      
      if (!isLocked) {
        console.log('🔒 [useCursorManagement] Pointer unlocked - making cursor visible');
        forceCursorVisible();
      } else {
        if (!isAnyUIOpen()) {
          console.log('🔒 [useCursorManagement] Pointer locked and no UI open - hiding cursor');
          resetCursorForGame();
        } else {
          console.log('🔒 [useCursorManagement] Pointer locked but UI is open - forcing cursor visible');
          forceCursorVisible();
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isAnyUIOpen, forceCursorVisible, resetCursorForGame]);

  return {
    mountRef,
    forceCursorVisible,
    resetCursorForGame
  };
};
