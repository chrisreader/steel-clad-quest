
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
      // Sample inventory items
      setInventory([
        { id: '1', name: 'Health Potion', type: 'potion', value: 50, description: 'Restores 50 health', quantity: 3 },
        { id: '2', name: 'Iron Sword', type: 'weapon', value: 100, description: 'A sturdy iron sword', quantity: 1 },
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

    // Expose methods to parent component
    React.useImperativeHandle(ref, () => ({
      restartGame,
      goToMainMenu,
      handleUseItem,
      handleUpgradeSkill,
      handleCraft,
      initializeSampleData,
      inventory,
      quests,
      skills
    }), [restartGame, goToMainMenu, handleUseItem, handleUpgradeSkill, handleCraft, initializeSampleData, inventory, quests, skills]);

    return null; // This component only manages state, no UI
  }
);

GameController.displayName = 'GameController';

export { GameController as default };
