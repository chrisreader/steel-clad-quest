import React, { useState, useCallback, useRef } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';
import { PlayerStats, Item, Quest, Skill } from '../../types/GameTypes';

interface GameControllerProps {
  gameEngine: GameEngine | null;
  onStatsUpdate: (stats: PlayerStats) => void;
  onGameTimeUpdate: (time: number) => void;
  onGameOverChange: (isGameOver: boolean) => void;
  onLocationChange: (isInTavern: boolean) => void;
  onInventoryUpdate?: (inventory: Item[]) => void;
}

export interface GameControllerRef {
  restartGame: () => void;
  goToMainMenu: () => void;
  handleUseItem: (item: Item) => void;
  handleUpgradeSkill: (skill: Skill) => void;
  handleCraft: (recipe: any) => void;
  initializeSampleData: () => void;
  handleEquipWeapon: (item: Item) => void;
  handleUnequipWeapon: () => void;
  inventory: Item[];
  quests: Quest[];
  skills: Skill[];
}

export const GameController = React.forwardRef<GameControllerRef, GameControllerProps>(
  ({ gameEngine, onStatsUpdate, onGameTimeUpdate, onGameOverChange, onLocationChange, onInventoryUpdate }, ref) => {
    const [inventory, setInventory] = useState<Item[]>([]);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);

    const updateInventory = useCallback((newInventory: Item[]) => {
      console.log('GameController: Updating inventory:', newInventory);
      setInventory(newInventory);
      onInventoryUpdate?.(newInventory);
    }, [onInventoryUpdate]);

    const initializeSampleData = useCallback(() => {
      // Steel Sword first (slot 1)
      const initialInventory: Item[] = [
        { 
          id: '9', 
          name: 'Steel Sword', 
          type: 'weapon' as const, 
          subtype: 'sword' as const,
          value: 200, 
          description: 'A masterfully forged steel blade with razor-sharp edges. This superior weapon offers exceptional balance and deadly precision in combat (+15 attack)', 
          quantity: 1,
          equipmentSlot: 'mainhand' as const,
          stats: { attack: 15 },
          tier: 'uncommon' as const,
          icon: 'sword',
          weaponId: 'steel_sword'
        },
        { 
          id: '1', 
          name: 'Health Potion', 
          type: 'potion' as const, 
          value: 50, 
          description: 'Restores 50 health', 
          quantity: 3,
          icon: 'potion'
        },
        { 
          id: '2', 
          name: 'Iron Sword', 
          type: 'weapon' as const, 
          subtype: 'sword' as const,
          value: 100, 
          description: 'A sturdy iron sword (+10 attack)', 
          quantity: 1,
          equipmentSlot: 'mainhand' as const,
          stats: { attack: 10 },
          tier: 'common' as const,
          icon: 'sword',
          weaponId: 'iron_sword'
        },
        { 
          id: '8', 
          name: 'Wooden Sword', 
          type: 'weapon' as const, 
          subtype: 'sword' as const,
          value: 25, 
          description: 'A basic wooden sword (+5 attack)', 
          quantity: 1,
          equipmentSlot: 'mainhand' as const,
          stats: { attack: 5 },
          tier: 'common' as const,
          icon: 'sword',
          weaponId: 'wooden_sword'
        },
        { 
          id: '3', 
          name: 'Leather Helmet', 
          type: 'armor' as const, 
          subtype: 'helmet' as const,
          value: 25, 
          description: 'Basic leather protection (+2 defense)', 
          quantity: 1,
          equipmentSlot: 'helmet' as const,
          stats: { defense: 2 },
          tier: 'common' as const
        },
        { 
          id: '4', 
          name: 'Iron Chestplate', 
          type: 'armor' as const, 
          subtype: 'chestplate' as const,
          value: 150, 
          description: 'Strong iron armor (+8 defense)', 
          quantity: 1,
          equipmentSlot: 'chestplate' as const,
          stats: { defense: 8 },
          tier: 'uncommon' as const
        },
        { 
          id: '5', 
          name: 'Chain Leggings', 
          type: 'armor' as const, 
          subtype: 'leggings' as const,
          value: 75, 
          description: 'Flexible chain mail (+4 defense)', 
          quantity: 1,
          equipmentSlot: 'leggings' as const,
          stats: { defense: 4 },
          tier: 'common' as const
        },
        { 
          id: '6', 
          name: 'Steel Boots', 
          type: 'armor' as const, 
          subtype: 'boots' as const,
          value: 60, 
          description: 'Sturdy steel boots (+3 defense)', 
          quantity: 1,
          equipmentSlot: 'boots' as const,
          stats: { defense: 3 },
          tier: 'common' as const
        },
        { 
          id: '7', 
          name: 'Wooden Shield', 
          type: 'weapon' as const, 
          subtype: 'shield' as const,
          value: 40, 
          description: 'Basic wooden shield (+5 defense)', 
          quantity: 1,
          equipmentSlot: 'offhand' as const,
          stats: { defense: 5 },
          tier: 'common' as const
        }
      ];

      updateInventory(initialInventory);

      // Sample quests
      setQuests([
        {
          id: '1',
          title: 'Defend the Tavern',
          description: 'Protect the tavern from goblin raiders',
          objectives: ['Defeat 5 goblins', 'Protect tavern customers'],
          completed: false,
          rewards: { gold: 100, experience: 50 }
        }
      ]);

      // Sample skills
      setSkills([
        {
          id: '1',
          name: 'Sword Mastery',
          description: 'Increases sword damage',
          level: 1,
          maxLevel: 5,
          cost: 1,
          unlocked: true
        },
        {
          id: '2',
          name: 'Heavy Armor',
          description: 'Increases defense',
          level: 0,
          maxLevel: 3,
          cost: 2,
          unlocked: true
        }
      ]);

      console.log("Steel Sword spawned in inventory slot 1 (index 0)");
    }, [updateInventory]);

    const restartGame = useCallback(() => {
      if (gameEngine) {
        gameEngine.restart();
        onGameTimeUpdate(0);
        onGameOverChange(false);
        onLocationChange(true);
        onStatsUpdate({
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
      }
    }, [gameEngine, onStatsUpdate, onGameTimeUpdate, onGameOverChange, onLocationChange]);

    const goToMainMenu = useCallback(() => {
      if (gameEngine) {
        gameEngine.pause();
      }
      onGameOverChange(false);
    }, [gameEngine, onGameOverChange]);

    const handleUseItem = useCallback((item: Item) => {
      if (item.type === 'potion' && item.name === 'Health Potion') {
        console.log(`Used ${item.name}`);
        if (gameEngine) {
          const player = gameEngine.getPlayer();
          player.heal(item.value);
        }
      }
    }, [gameEngine]);

    const handleUpgradeSkill = useCallback((skill: Skill) => {
      if (skill.level < skill.maxLevel) {
        console.log(`Upgraded ${skill.name}`);
        setSkills(prevSkills => 
          prevSkills.map(s => 
            s.id === skill.id 
              ? { ...s, level: s.level + 1 }
              : s
          )
        );
      }
    }, []);

    const handleCraft = useCallback((recipe: any) => {
      console.log(`Crafted ${recipe.name}`);
    }, []);

    const handleEquipWeapon = useCallback((item: Item) => {
      if (gameEngine && item.weaponId) {
        const player = gameEngine.getPlayer();
        const success = player.equipWeapon(item.weaponId);
        
        if (success) {
          console.log(`Successfully equipped ${item.name}`);
          // Update player stats based on weapon
          if (item.stats) {
            const currentStats = player.getStats();
            const updatedStats = {
              ...currentStats,
              attack: currentStats.attack + (item.stats.attack || 0),
              attackPower: currentStats.attackPower + (item.stats.attack || 0)
            };
            onStatsUpdate(updatedStats);
          }
        } else {
          console.error(`Failed to equip ${item.name}`);
        }
      }
    }, [gameEngine, onStatsUpdate]);

    const handleUnequipWeapon = useCallback(() => {
      if (gameEngine) {
        const player = gameEngine.getPlayer();
        const success = player.unequipWeapon();
        
        if (success) {
          console.log('Weapon unequipped');
          // Reset player stats
          const currentStats = player.getStats();
          onStatsUpdate(currentStats);
        }
      }
    }, [gameEngine, onStatsUpdate]);

    // Expose methods to parent component
    React.useImperativeHandle(ref, () => ({
      restartGame,
      goToMainMenu,
      handleUseItem,
      handleUpgradeSkill,
      handleCraft,
      initializeSampleData,
      handleEquipWeapon,
      handleUnequipWeapon,
      inventory,
      quests,
      skills
    }), [restartGame, goToMainMenu, handleUseItem, handleUpgradeSkill, handleCraft, initializeSampleData, handleEquipWeapon, handleUnequipWeapon, inventory, quests, skills]);

    return null; // This component only manages state, no UI
  }
);

GameController.displayName = 'GameController';

export { GameController as default };
