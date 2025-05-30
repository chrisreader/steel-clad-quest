
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameHUD } from './UI/GameHUD';
import { GameOverScreen } from './UI/GameOverScreen';
import { GameMenu } from './UI/GameMenu';
import { GameControls } from './UI/GameControls';
import { InventoryUI } from './UI/InventoryUI';
import { SkillTreeUI } from './UI/SkillTreeUI';
import { QuestLogUI } from './UI/QuestLogUI';
import { CraftingUI } from './UI/CraftingUI';
import GameControlPanel from './UI/GameControlPanel';
import PlayerStatsPanel from './UI/PlayerStatsPanel';
import GameEngineController from './GameEngineController';
import GameController, { GameControllerRef } from './GameController';
import { GameEngine } from '../../game/engine/GameEngine';
import { PlayerStats, Item, Quest, Skill } from '../../types/GameTypes';

interface KnightGameProps {
  onLoadingComplete?: () => void;
}

export const KnightGame: React.FC<KnightGameProps> = ({ onLoadingComplete }) => {
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
  const [gameStarted, setGameStarted] = useState(false);
  const [isInTavern, setIsInTavern] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // UI state
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);

  const gameControllerRef = useRef<GameControllerRef>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  // Handler for engine loading completion
  const handleEngineLoadingComplete = useCallback(() => {
    setEngineReady(true);
    onLoadingComplete?.(); // Forward to parent if needed
  }, [onLoadingComplete]);

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
    // Handle score updates if needed
    console.log('Score updated:', score);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    setIsGameOver(true);
  }, []);

  const handleLocationChange = useCallback((isInTavern: boolean) => {
    setIsInTavern(isInTavern);
  }, []);

  const handleGameEngineReady = useCallback((engine: GameEngine) => {
    console.log('Game engine ready!');
    setGameEngine(engine);
    
    // Set up engine callbacks
    engine.setOnUpdateHealth(handleUpdateHealth);
    engine.setOnUpdateGold(handleUpdateGold);
    engine.setOnUpdateStamina(handleUpdateStamina);
    engine.setOnGameOver(handleGameOver);
    engine.setOnLocationChange(handleLocationChange);
  }, [handleUpdateHealth, handleUpdateGold, handleUpdateStamina, handleGameOver, handleLocationChange]);

  const startGame = useCallback(() => {
    if (gameEngine) {
      console.log('Starting knight adventure...');
      gameEngine.initialize().then(() => {
        setGameStarted(true);
        setIsGameOver(false);
        gameControllerRef.current?.initializeSampleData();
      });
    }
  }, [gameEngine]);

  const togglePause = useCallback(() => {
    if (gameEngine) {
      gameEngine.pause();
      setIsPaused(!isPaused);
    }
  }, [gameEngine, isPaused]);

  const restartGame = useCallback(() => {
    gameControllerRef.current?.restartGame();
    setGameStarted(true);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  const goToMainMenu = useCallback(() => {
    gameControllerRef.current?.goToMainMenu();
    setGameStarted(false);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      // Prevent default for game controls
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'Space':
          gameEngine.handleInput('attack');
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
        case 'KeyT':
          setShowStatsPanel(!showStatsPanel);
          break;
        case 'Escape':
          if (showInventory || showSkillTree || showQuestLog || showCrafting || showStatsPanel) {
            setShowInventory(false);
            setShowSkillTree(false);
            setShowQuestLog(false);
            setShowCrafting(false);
            setShowStatsPanel(false);
          } else {
            togglePause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameEngine, showInventory, showSkillTree, showQuestLog, showCrafting, showStatsPanel, togglePause]);

  // Update game state from engine
  useEffect(() => {
    if (!gameStarted || !gameEngine) return;

    const updateInterval = setInterval(() => {
      if (gameEngine.isRunning() && !gameEngine.isPaused()) {
        const player = gameEngine.getPlayer();
        const gameState = gameEngine.getGameState();
        
        setPlayerStats(player.getStats());
        setGameTime(gameState.timeElapsed);
        
        if (!player.isAlive()) {
          setIsGameOver(true);
        }
      }
    }, 100);

    return () => clearInterval(updateInterval);
  }, [gameStarted, gameEngine]);

  if (!gameStarted) {
    return <GameMenu onStartGame={startGame} />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Engine Controller - handles the THREE.js game engine */}
      <GameEngineController
        onUpdateHealth={handleUpdateHealth}
        onUpdateGold={handleUpdateGold}
        onUpdateStamina={handleUpdateStamina}
        onUpdateScore={handleUpdateScore}
        onGameOver={handleGameOver}
        onLocationChange={handleLocationChange}
        onLoadingComplete={handleEngineLoadingComplete}
        mountElement={mountRef.current}
      />
      
      <GameCanvas onGameEngineReady={handleGameEngineReady} />
      
      <GameController
        ref={gameControllerRef}
        gameEngine={gameEngine}
        onStatsUpdate={setPlayerStats}
        onGameTimeUpdate={setGameTime}
        onGameOverChange={setIsGameOver}
        onLocationChange={setIsInTavern}
      />
      
      {gameStarted && !isGameOver && (
        <GameHUD 
          playerStats={playerStats} 
          gameTime={gameTime} 
          isInTavern={isInTavern}
        />
      )}

      {/* Stats Panel Toggle Button */}
      <button 
        onClick={() => setShowStatsPanel(!showStatsPanel)}
        className="absolute left-4 top-28 z-10 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
        title="Press T to toggle stats panel"
      >
        Stats
      </button>

      {/* New Game Control Panel */}
      <GameControlPanel
        isPaused={isPaused}
        onPauseToggle={togglePause}
        onRestart={restartGame}
        isGameOver={isGameOver}
      />

      {/* New Player Stats Panel */}
      <PlayerStatsPanel
        playerStats={playerStats}
        isVisible={showStatsPanel}
        onClose={() => setShowStatsPanel(false)}
      />

      <InventoryUI
        items={gameControllerRef.current?.inventory || []}
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        onUseItem={gameControllerRef.current?.handleUseItem || (() => {})}
      />

      <SkillTreeUI
        skills={gameControllerRef.current?.skills || []}
        isOpen={showSkillTree}
        onClose={() => setShowSkillTree(false)}
        onUpgradeSkill={gameControllerRef.current?.handleUpgradeSkill || (() => {})}
        availablePoints={playerStats.level - 1}
      />

      <QuestLogUI
        quests={gameControllerRef.current?.quests || []}
        isOpen={showQuestLog}
        onClose={() => setShowQuestLog(false)}
      />

      <CraftingUI
        recipes={[]}
        inventory={gameControllerRef.current?.inventory || []}
        isOpen={showCrafting}
        onClose={() => setShowCrafting(false)}
        onCraft={gameControllerRef.current?.handleCraft || (() => {})}
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
