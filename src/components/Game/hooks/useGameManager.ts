import { useState, useCallback } from 'react';
import { PlayerStats, Item } from '../../../types/GameTypes';
import { GameEngine } from '../../../game/core/GameEngine';

export const useGameManager = () => {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  
  // Initialize inventory with hunting bow - updated to use 'primary' slot
  const [inventory, setInventory] = useState<Item[]>([
    {
      id: '2',
      name: 'Hunting Bow',
      type: 'weapon' as const,
      subtype: 'bow' as const,
      value: 150,
      description: 'A well-crafted hunting bow made from flexible yew wood. Draw and release to shoot arrows with varying power based on draw time. Perfect for ranged combat (+8 attack)',
      quantity: 1,
      equipmentSlot: 'primary' as const,
      stats: { attack: 8 },
      tier: 'common' as const,
      icon: 'bow',
      weaponId: 'hunting_bow'
    }
  ]);

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
