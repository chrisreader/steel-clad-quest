import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../../game/core/GameEngine';

interface KnightGameProps {
  onUpdateHealth?: (health: number) => void;
  onUpdateGold?: (gold: number) => void;
  onUpdateStamina?: (stamina: number) => void;
  onUpdateScore?: (score: number) => void;
  onGameOver?: (score: number) => void;
  onLocationChange?: (isInTavern: boolean) => void;
}

export const KnightGame: React.FC<KnightGameProps> = ({
  onUpdateHealth,
  onUpdateGold,
  onUpdateStamina,
  onUpdateScore,
  onGameOver,
  onLocationChange
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [isUIOpen, setIsUIOpen] = useState(false);
  
  useEffect(() => {
    const initializeGame = async () => {
      if (!gameContainerRef.current) {
        console.error("Game container ref not yet available.");
        return;
      }
      
      console.log("⚔️ [KnightGame] Initializing game...");
      const newGameEngine = new GameEngine(gameContainerRef.current);
      
      // Set callbacks
      if (onUpdateHealth) newGameEngine.setOnUpdateHealth(onUpdateHealth);
      if (onUpdateGold) newGameEngine.setOnUpdateGold(onUpdateGold);
      if (onUpdateStamina) newGameEngine.setOnUpdateStamina(onUpdateStamina);
      if (onUpdateScore) newGameEngine.setOnUpdateScore(onUpdateScore);
      if (onGameOver) newGameEngine.setOnGameOver(onGameOver);
      if (onLocationChange) newGameEngine.setOnLocationChange(onLocationChange);
      
      // Initialize and start
      try {
        await newGameEngine.initialize();
        setGameEngine(newGameEngine);
        setIsGameLoaded(true);
        console.log("⚔️ [KnightGame] Game initialized successfully");
      } catch (error) {
        console.error("⚔️ [KnightGame] Failed to initialize game:", error);
        setIsGameLoaded(false);
      }
    };
    
    initializeGame();
    
    return () => {
      if (gameEngine) {
        console.log("⚔️ [KnightGame] Disposing game...");
        gameEngine.dispose();
        console.log("⚔️ [KnightGame] Game disposed");
      }
    };
  }, [onUpdateHealth, onUpdateGold, onUpdateStamina, onUpdateScore, onGameOver, onLocationChange]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameEngine && gameEngine.isRunning()) {
        event.preventDefault();
        
        const newState = !isUIOpen;
        setIsUIOpen(newState);
        gameEngine.setUIState(newState);
        
        if (newState) {
          gameEngine.handleInput('requestPointerUnlock');
        } else {
          gameEngine.handleInput('requestPointerLock');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameEngine, isUIOpen]);
  
  const handleGameInput = (type: string, data?: any) => {
    if (gameEngine) {
      gameEngine.handleInput(type, data);
    }
  };
  
  const handleAttackStart = () => {
    handleGameInput('attack');
  };
  
  const handleAttackEnd = () => {
    handleGameInput('attackEnd');
  };
  
  return (
    <div
      id="gameContainer"
      ref={gameContainerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        outline: 'none'
      }}
    >
      {isGameLoaded ? (
        <>
          <GameInputHandler
            onAttackStart={handleAttackStart}
            onAttackEnd={handleAttackEnd}
            onGameInput={handleGameInput}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '24px',
            textAlign: 'center'
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
};

interface GameInputHandlerProps {
  onAttackStart: () => void;
  onAttackEnd: () => void;
  onGameInput: (type: string, data?: any) => void;
}

const GameInputHandler: React.FC<GameInputHandlerProps> = ({
  onAttackStart,
  onAttackEnd,
  onGameInput
}) => {
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        onAttackStart();
      }
    };
    
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        onAttackEnd();
      }
    };
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onAttackStart, onAttackEnd]);
  
  return null;
};
