
import React, { useState, useCallback, useRef } from 'react';
import { GameEngine } from '../../game/engine/GameEngine';
import { PlayerStats, Quest, Skill } from '../../types/GameTypes';

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
  handleUpgradeSkill: (skill: Skill) => void;
  handleCraft: (recipe: any) => void;
  quests: Quest[];
  skills: Skill[];
}

export const GameController = React.forwardRef<GameControllerRef, GameControllerProps>(
  ({ gameEngine, onStatsUpdate, onGameTimeUpdate, onGameOverChange, onLocationChange }, ref) => {
    // Removed inventory state - now managed in KnightGame
    const [quests, setQuests] = useState<Quest[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);

    // Initialize sample quests and skills on mount
    React.useEffect(() => {
      // Initializing quests and skills...
      
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

    const handleUpgradeSkill = useCallback((skill: Skill) => {
      if (skill.level < skill.maxLevel) {
        // Skill upgraded
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
      // Item crafted
    }, []);

    // Simplified ref interface - removed inventory methods
    React.useImperativeHandle(ref, () => ({
      restartGame,
      goToMainMenu,
      handleUpgradeSkill,
      handleCraft,
      quests,
      skills
    }), [restartGame, goToMainMenu, handleUpgradeSkill, handleCraft, quests, skills]);

    return null; // This component only manages state, no UI
  }
);

GameController.displayName = 'GameController';

export { GameController as default };
