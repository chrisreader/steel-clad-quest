
import { useState, useCallback } from 'react';
import { PlayerStats } from '../../../types/GameTypes';

export const useGameState = () => {
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    experience: 0,
    experienceToNext: 100,
    gold: 0,
    attack: 10,
    defense: 5,
    speed: 5,
    attackPower: 10
  });
  
  const [gameTime, setGameTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isInTavern, setIsInTavern] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Update handlers for engine integration
  const handleUpdateHealth = useCallback((health: number) => {
    setPlayerStats(prev => ({ ...prev, health }));
  }, []);

  const handleUpdateGold = useCallback((gold: number) => {
    setPlayerStats(prev => ({ ...prev, gold }));
  }, []);

  const handleUpdateStamina = useCallback((stamina: number) => {
    setPlayerStats(prev => ({ ...prev, stamina }));
  }, []);

  const handleUpdateScore = useCallback((score: number) => {
    console.log('Score updated:', score);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    setIsGameOver(true);
  }, []);

  const handleLocationChange = useCallback((isInTavern: boolean) => {
    setIsInTavern(isInTavern);
  }, []);

  return {
    // State
    playerStats,
    gameTime,
    isGameOver,
    gameStarted,
    isInTavern,
    isPaused,
    
    // Setters
    setPlayerStats,
    setGameTime,
    setIsGameOver,
    setGameStarted,
    setIsInTavern,
    setIsPaused,
    
    // Handlers
    handleUpdateHealth,
    handleUpdateGold,
    handleUpdateStamina,
    handleUpdateScore,
    handleGameOver,
    handleLocationChange
  };
};
