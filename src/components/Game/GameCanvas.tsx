
import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';

interface GameCanvasProps {
  onGameEngineReady: (engine: GameEngine) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameEngineReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing game canvas...');
    const gameEngine = new GameEngine(containerRef.current);
    gameEngineRef.current = gameEngine;
    onGameEngineReady(gameEngine);

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
      }
    };
  }, [onGameEngineReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full block"
      style={{ background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
    />
  );
};
