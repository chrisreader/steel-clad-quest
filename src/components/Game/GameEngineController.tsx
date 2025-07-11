
import React, { useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';

interface GameEngineControllerProps {
  onUpdateHealth: (health: number) => void;
  onUpdateGold: (gold: number) => void;
  onUpdateStamina: (stamina: number) => void;
  onUpdateScore: (score: number) => void;
  onGameOver: (score: number) => void;
  onLocationChange: (isInTavern: boolean) => void;
  onLoadingComplete: () => void;
  mountElement: HTMLDivElement | null;
}

export interface GameEngineControllerRef {
  restart: () => void;
  pause: () => void;
  resume: () => void;
  getEngine: () => GameEngine | null;
}

const GameEngineController = React.forwardRef<GameEngineControllerRef, GameEngineControllerProps>(
  ({
    onUpdateHealth,
    onUpdateGold,
    onUpdateStamina,
    onUpdateScore,
    onGameOver,
    onLocationChange,
    onLoadingComplete,
    mountElement
  }, ref) => {
    const engineRef = useRef<GameEngine | null>(null);
    
    // Initialize game engine
    useEffect(() => {
      if (!mountElement) {
        return;
      }
      
      const initGame = async () => {
        try {
          // Create game engine
          const engine = new GameEngine(mountElement);
          
          // Set callbacks
          engine.setOnUpdateHealth(onUpdateHealth);
          engine.setOnUpdateGold(onUpdateGold);
          engine.setOnUpdateStamina(onUpdateStamina);
          engine.setOnUpdateScore(onUpdateScore);
          engine.setOnGameOver(onGameOver);
          engine.setOnLocationChange(onLocationChange);
          
          // Initialize engine
          await engine.initialize();
          
          // Store engine reference
          engineRef.current = engine;
          
          // Notify loading complete
          onLoadingComplete();
          
          // Set up input event listeners
          document.addEventListener('gameInput', handleGameInput);
          
        } catch (error) {
          console.error("[GameEngineController] Failed to initialize game engine:", error);
          onLoadingComplete(); // Still notify loading complete to avoid hanging UI
        }
      };
      
      initGame();
      
      // Cleanup function
      return () => {
        // Dispose engine
        if (engineRef.current) {
          engineRef.current.dispose();
        }
        
        // Remove event listeners
        document.removeEventListener('gameInput', handleGameInput);
      };
    }, [mountElement, onUpdateHealth, onUpdateGold, onUpdateStamina, onUpdateScore, onGameOver, onLocationChange, onLoadingComplete]);
    
    // Handle game input events
    const handleGameInput = useCallback((event: Event) => {
      if (!engineRef.current) return;
      
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      // Process input
      engineRef.current.handleInput(type, data);
    }, []);
    
    // Public methods exposed via ref
    
    // Restart the game
    const restartGame = useCallback(() => {
      if (engineRef.current) {
        engineRef.current.restart();
      }
    }, []);
    
    // Pause the game
    const pauseGame = useCallback(() => {
      if (engineRef.current) {
        engineRef.current.pause();
      }
    }, []);
    
    // Resume the game (use pause method since it toggles)
    const resumeGame = useCallback(() => {
      if (engineRef.current) {
        engineRef.current.pause();
      }
    }, []);
    
    // Expose methods to parent component through ref
    React.useImperativeHandle(ref, () => ({
      restart: restartGame,
      pause: pauseGame,
      resume: resumeGame,
      getEngine: () => engineRef.current,
    }), [restartGame, pauseGame, resumeGame]);
    
    // This component doesn't render anything, it just manages the game engine
    return null;
  }
);

GameEngineController.displayName = 'GameEngineController';

export default React.memo(GameEngineController);
