import React, { useState, useCallback, useRef } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';
import { PlayerStats, Item, Quest, Skill } from '../../types/GameTypes';

interface GameControllerProps {
  gameEngine: GameEngine | null;
  onStatsUpdate: (stats: PlayerStats) => void;
  onGameTimeUpdate: (time: number) => void;
  onGameOverChange: (isGameOver: boolean) => void;
  onLocationChange: (isInTavern: boolean) => void;
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
  ({ gameEngine, onStatsUpdate, onGameTimeUpdate, onGameOverChange, onLocationChange }, ref) => {
    const [inventory, setInventory] = useState<Item[]>([]);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);

    const initializeSampleData = useCallback(() => {
      // Enhanced sample inventory with weapon IDs
      setInventory([
        { 
          id: '1', 
          name: 'Health Potion', 
          type: 'potion', 
          value: 50, 
          description: 'Restores 50 health', 
          quantity: 3,
          icon: 'potion'
        },
        { 
          id: '2', 
          name: 'Iron Sword', 
          type: 'weapon', 
          subtype: 'sword',
          value: 100, 
          description: 'A sturdy iron sword (+10 attack)', 
          quantity: 1,
          equipmentSlot: 'mainhand',
          stats: { attack: 10 },
          tier: 'common',
          icon: 'sword',
          weaponId: 'iron_sword' // Links to weapon system
        },
        { 
          id: '8', 
          name: 'Wooden Sword', 
          type: 'weapon', 
          subtype: 'sword',
          value: 25, 
          description: 'A basic wooden sword (+5 attack)', 
          quantity: 1,
          equipmentSlot: 'mainhand',
          stats: { attack: 5 },
          tier: 'common',
          icon: 'sword',
          weaponId: 'wooden_sword'
        },
        { 
          id: '9', 
          name: 'Steel Sword', 
          type: 'weapon', 
          subtype: 'sword',
          value: 200, 
          description: 'A powerful steel sword (+15 attack)', 
          quantity: 1,
          equipmentSlot: 'mainhand',
          stats: { attack: 15 },
          tier: 'uncommon',
          icon: 'sword',
          weaponId: 'steel_sword'
        },
        { 
          id: '3', 
          name: 'Leather Helmet', 
          type: 'armor', 
          subtype: 'helmet',
          value: 25, 
          description: 'Basic leather protection (+2 defense)', 
          quantity: 1,
          equipmentSlot: 'helmet',
          stats: { defense: 2 },
          tier: 'common'
        },
        { 
          id: '4', 
          name: 'Iron Chestplate', 
          type: 'armor', 
          subtype: 'chestplate',
          value: 150, 
          description: 'Strong iron armor (+8 defense)', 
          quantity: 1,
          equipmentSlot: 'chestplate',
          stats: { defense: 8 },
          tier: 'uncommon'
        },
        { 
          id: '5', 
          name: 'Chain Leggings', 
          type: 'armor', 
          subtype: 'leggings',
          value: 75, 
          description: 'Flexible chain mail (+4 defense)', 
          quantity: 1,
          equipmentSlot: 'leggings',
          stats: { defense: 4 },
          tier: 'common'
        },
        { 
          id: '6', 
          name: 'Steel Boots', 
          type: 'armor', 
          subtype: 'boots',
          value: 60, 
          description: 'Sturdy steel boots (+3 defense)', 
          quantity: 1,
          equipmentSlot: 'boots',
          stats: { defense: 3 },
          tier: 'common'
        },
        { 
          id: '7', 
          name: 'Wooden Shield', 
          type: 'weapon', 
          subtype: 'shield',
          value: 40, 
          description: 'Basic wooden shield (+5 defense)', 
          quantity: 1,
          equipmentSlot: 'offhand',
          stats: { defense: 5 },
          tier: 'common'
        }
      ]);

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

      // Equip default weapon when game starts
      if (gameEngine) {
        const player = gameEngine.getPlayer();
        if (player) {
          // Equip iron sword as default weapon
          player.equipWeapon('iron_sword');
          console.log("Default weapon equipped: Iron Sword");
        }
      }
    }, []);

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
