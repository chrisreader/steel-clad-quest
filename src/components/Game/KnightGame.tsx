
import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameHUD } from './UI/GameHUD';
import { GameOverScreen } from './UI/GameOverScreen';
import { InventoryUI } from './UI/InventoryUI';
import { SkillTreeUI } from './UI/SkillTreeUI';
import { QuestLogUI } from './UI/QuestLogUI';
import { CraftingUI } from './UI/CraftingUI';
import { GameEngine } from '../../game/engine/GameEngine';
import { PlayerStats, Item, Quest, Skill } from '../../types/GameTypes';

export const KnightGame: React.FC = () => {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
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
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  const handleGameEngineReady = useCallback((engine: GameEngine) => {
    console.log('Game engine ready!');
    setGameEngine(engine);
  }, []);

  const startGame = () => {
    if (gameEngine) {
      console.log('Starting knight adventure...');
      gameEngine.start();
      setGameStarted(true);
      setIsGameOver(false);
      
      // Initialize sample data
      initializeSampleData();
    }
  };

  const initializeSampleData = () => {
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
  };

  const restartGame = () => {
    if (gameEngine) {
      gameEngine.restart();
      setGameTime(0);
      setIsGameOver(false);
      setPlayerStats({
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
      startGame();
    }
  };

  const goToMainMenu = () => {
    if (gameEngine) {
      gameEngine.pause();
    }
    setGameStarted(false);
    setIsGameOver(false);
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      const player = gameEngine.getPlayer();
      const gameState = gameEngine.getGameState();

      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          player.move({ x: 0, y: 0, z: -1 }, 1/60);
          break;
        case 'KeyS':
        case 'ArrowDown':
          player.move({ x: 0, y: 0, z: 1 }, 1/60);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          player.move({ x: -1, y: 0, z: 0 }, 1/60);
          break;
        case 'KeyD':
        case 'ArrowRight':
          player.move({ x: 1, y: 0, z: 0 }, 1/60);
          break;
        case 'Space':
          event.preventDefault();
          player.attack();
          break;
        case 'KeyI':
          setShowInventory(!showInventory);
          break;
        case 'KeyK':
          setShowSkillTree(!showSkillTree);
          break;
        case 'KeyQ':
          setShowQuestLog(!showQuestLog);
          break;
        case 'KeyC':
          setShowCrafting(!showCrafting);
          break;
        case 'Escape':
          if (showInventory || showSkillTree || showQuestLog || showCrafting) {
            setShowInventory(false);
            setShowSkillTree(false);
            setShowQuestLog(false);
            setShowCrafting(false);
          } else {
            gameEngine.pause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameEngine, showInventory, showSkillTree, showQuestLog, showCrafting]);

  useEffect(() => {
    if (!gameStarted || !gameEngine) return;

    const updateInterval = setInterval(() => {
      const player = gameEngine.getPlayer();
      const gameState = gameEngine.getGameState();
      
      setPlayerStats(player.getStats());
      setGameTime(gameState.timeElapsed);
      
      if (!player.isAlive()) {
        setIsGameOver(true);
      }
    }, 100);

    return () => clearInterval(updateInterval);
  }, [gameStarted, gameEngine]);

  const handleUseItem = (item: Item) => {
    if (item.type === 'potion' && item.name === 'Health Potion') {
      // Use health potion logic would go here
      console.log(`Used ${item.name}`);
    }
  };

  const handleUpgradeSkill = (skill: Skill) => {
    if (skill.level < skill.maxLevel) {
      console.log(`Upgraded ${skill.name}`);
    }
  };

  const handleCraft = (recipe: any) => {
    console.log(`Crafted ${recipe.name}`);
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-700 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4 text-yellow-400">Knight's Quest</h1>
          <p className="text-xl mb-8 text-gray-300">A Medieval Action RPG Adventure</p>
          <button
            onClick={startGame}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
          >
            Begin Adventure
          </button>
          <div className="mt-8 text-sm text-gray-400">
            <p>Controls: WASD/Arrow Keys to move, Space to attack</p>
            <p>I = Inventory, K = Skills, Q = Quests, C = Crafting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GameCanvas onGameEngineReady={handleGameEngineReady} />
      
      {gameStarted && !isGameOver && (
        <GameHUD playerStats={playerStats} gameTime={gameTime} />
      )}

      <InventoryUI
        items={inventory}
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        onUseItem={handleUseItem}
      />

      <SkillTreeUI
        skills={skills}
        isOpen={showSkillTree}
        onClose={() => setShowSkillTree(false)}
        onUpgradeSkill={handleUpgradeSkill}
        availablePoints={playerStats.level - 1}
      />

      <QuestLogUI
        quests={quests}
        isOpen={showQuestLog}
        onClose={() => setShowQuestLog(false)}
      />

      <CraftingUI
        recipes={[]}
        inventory={inventory}
        isOpen={showCrafting}
        onClose={() => setShowCrafting(false)}
        onCraft={handleCraft}
      />

      {isGameOver && (
        <GameOverScreen
          onRestart={restartGame}
          onMainMenu={goToMainMenu}
          finalStats={{
            level: playerStats.level,
            gold: playerStats.gold,
            timeElapsed: gameTime,
            enemiesDefeated: 0
          }}
        />
      )}
    </div>
  );
};
