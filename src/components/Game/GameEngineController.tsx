
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
      console.log('[GameEngineController] Component mounted with mountElement:', mountElement);
      
      if (!mountElement) {
        console.log('[GameEngineController] No mount element provided, skipping initialization');
        return;
      }
      
      const initGame = async () => {
        console.log('[GameEngineController] Starting initGame function');
        
        try {
          console.log('[GameEngineController] Creating GameEngine instance...');
          // Create game engine with mount element
          const engine = new GameEngine(mountElement);
          console.log('[GameEngineController] GameEngine created successfully:', engine);
          
          // Set callbacks
          engine.setOnUpdateHealth(onUpdateHealth);
          engine.setOnUpdateGold(onUpdateGold);
          engine.setOnUpdateStamina(onUpdateStamina);
          engine.setOnUpdateScore(onUpdateScore);
          engine.setOnGameOver(onGameOver);
          engine.setOnLocationChange(onLocationChange);
          console.log('[GameEngineController] Engine callbacks configured');
          
          console.log('[GameEngineController] Calling engine.initialize()...');
          // Initialize engine
          await engine.initialize();
          console.log('[GameEngineController] Engine initialization completed successfully');
          
          // Store engine reference
          engineRef.current = engine;
          console.log('[GameEngineController] Engine reference stored');
          
          console.log('[GameEngineController] Calling onLoadingComplete callback');
          // Notify loading complete
          onLoadingComplete();
          console.log('[GameEngineController] onLoadingComplete callback executed');
          
          // Set up input event listeners
          document.addEventListener('gameInput', handleGameInput);
          console.log('[GameEngineController] Input event listeners set up');
          
        } catch (error) {
          console.error("[GameEngineController] Failed to initialize game engine:", error);
          console.log('[GameEngineController] Calling onLoadingComplete despite error to prevent UI hanging');
          onLoadingComplete(); // Still notify loading complete to avoid hanging UI
        }
      };
      
      initGame();
      
      // Cleanup function
      return () => {
        console.log('[GameEngineController] Cleanup function called');
        // Dispose engine
        if (engineRef.current) {
          console.log('[GameEngineController] Disposing engine');
          engineRef.current.dispose();
        }
        
        // Remove event listeners
        document.removeEventListener('gameInput', handleGameInput);
        console.log('[GameEngineController] Event listeners removed');
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
      console.log('[GameEngineController] Restart game called');
      if (engineRef.current) {
        engineRef.current.restart();
      }
    }, []);
    
    // Pause the game
    const pauseGame = useCallback(() => {
      console.log('[GameEngineController] Pause game called');
      if (engineRef.current) {
        engineRef.current.pause();
      }
    }, []);
    
    // Resume the game (use pause method since it toggles)
    const resumeGame = useCallback(() => {
      console.log('[GameEngineController] Resume game called');
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
