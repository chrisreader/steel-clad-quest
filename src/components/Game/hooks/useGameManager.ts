
import { useState, useCallback } from 'react';
import { PlayerStats, Item } from '../../../types/GameTypes';
import { GameEngine } from '../../../game/engine/GameEngine';

export const useGameManager = () => {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);

  const handleEngineReady = useCallback((engine: GameEngine) => {
    console.log('[useGameManager] Engine ready');
    setGameEngine(engine);
    setEngineReady(true);
  }, []);

  const handleUseItem = useCallback((item: Item) => {
    console.log('[useGameManager] Using item:', item.name);
    
    if (item.type === 'potion' && item.name === 'Health Potion') {
      console.log(`Used ${item.name}`);
      if (gameEngine) {
        const player = gameEngine.getPlayer();
        player.heal(item.value);
        gameEngine.handleInput('playSound', { soundName: 'item_use' });
      }
    }
  }, [gameEngine]);

  return {
    gameEngine,
    engineReady,
    inventory,
    setGameEngine,
    setEngineReady,
    setInventory,
    handleEngineReady,
    handleUseItem
  };
};
