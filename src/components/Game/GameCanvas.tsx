
import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';

interface GameCanvasProps {
  onGameEngineReady: (engine: GameEngine) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameEngineReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('Initializing game canvas...');
    const gameEngine = new GameEngine(canvasRef.current);
    gameEngineRef.current = gameEngine;
    onGameEngineReady(gameEngine);

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
      }
    };
  }, [onGameEngineReady]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
    />
  );
};
