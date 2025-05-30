import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameHUD } from './UI/GameHUD';
import { GameOverScreen } from './UI/GameOverScreen';
import { GameMenu } from './UI/GameMenu';
import { GameControls } from './UI/GameControls';
import { InventorySystem } from './systems/InventorySystem';
import { SkillTreeUI } from './UI/SkillTreeUI';
import { QuestLogUI } from './UI/QuestLogUI';
import { CraftingUI } from './UI/CraftingUI';
import GameControlPanel from './UI/GameControlPanel';
import PlayerStatsPanel from './UI/PlayerStatsPanel';
import GameEngineController from './GameEngineController';
import GameController, { GameControllerRef } from './GameController';
import { GameEngine } from '../../game/engine/GameEngine';
import { Item } from '../../types/GameTypes';
import { useGameState } from './hooks/useGameState';
import { useUIState } from './hooks/useUIState';
import { useWeaponManagement } from './hooks/useWeaponManagement';
import { useGameManager } from './hooks/useGameManager';
import { useCursorManagement } from './hooks/useCursorManagement';
import { useInputHandling } from './hooks/useInputHandling';

interface KnightGameProps {
  onLoadingComplete?: () => void;
}

// Add interface for GameEngineController ref
interface GameEngineControllerRef {
  restart: () => void;
  pause: () => void;
  resume: () => void;
  getEngine: () => GameEngine | null;
}

export const KnightGame: React.FC<KnightGameProps> = ({ onLoadingComplete }) => {
  // Use the game state hook
  const {
    playerStats,
    gameTime,
    isGameOver,
    gameStarted,
    isInTavern,
    isPaused,
    setPlayerStats,
    setGameTime,
    setIsGameOver,
    setGameStarted,
    setIsInTavern,
    setIsPaused,
    handleUpdateHealth,
    handleUpdateGold,
    handleUpdateStamina,
    handleUpdateScore,
    handleGameOver,
    handleLocationChange
  } = useGameState();

  // Use the UI state hook
  const {
    showInventory,
    showSkillTree,
    showQuestLog,
    showCrafting,
    showStatsPanel,
    setShowStatsPanel,
    isAnyUIOpen,
    toggleInventory,
    toggleSkillTree,
    toggleQuestLog,
    toggleCrafting,
    toggleStatsPanel,
    closeAllUIs
  } = useUIState();

  // Use the game manager hook
  const {
    gameEngine,
    engineReady,
    inventory,
    setGameEngine,
    setEngineReady,
    handleEngineReady,
    handleUseItem
  } = useGameManager();

  // Use weapon management hook with both Steel Sword and Hunting Bow
  const {
    equippedWeapons,
    setEquippedWeapons,
    activeWeaponSlot,
    handleEquipWeapon,
    handleUnequipWeapon,
    handleWeaponSlotSelect
  } = useWeaponManagement({
    mainhand: {
      id: '1', 
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
    offhand: null
  });

  // Add hunting bow to starting inventory
  useEffect(() => {
    const huntingBow = {
      id: '2',
      name: 'Hunting Bow',
      type: 'weapon' as const,
      subtype: 'bow' as const,
      value: 150,
      description: 'A well-crafted hunting bow made from flexible yew wood. Draw and release to shoot arrows with varying power based on draw time. Perfect for ranged combat (+8 attack)',
      quantity: 1,
      equipmentSlot: 'mainhand' as const,
      stats: { attack: 8 },
      tier: 'common' as const,
      icon: 'bow',
      weaponId: 'hunting_bow'
    };

    // Set initial inventory with hunting bow
    console.log('[KnightGame] Adding hunting bow to starting inventory');
    // The inventory will be updated through the useGameManager hook
  }, []);

  const [mountReady, setMountReady] = useState(false);
  const gameControllerRef = useRef<GameControllerRef>(null);
  const engineControllerRef = useRef<GameEngineControllerRef>(null);

  // Use cursor management hook
  const { mountRef, forceCursorVisible, resetCursorForGame } = useCursorManagement({
    gameEngine,
    isAnyUIOpen
  });

  // Log the initial setup
  useEffect(() => {
    console.log('[KnightGame] Initial setup - Steel Sword equipped in mainhand, Hunting Bow in inventory');
  }, []); // Empty dependency array - runs once on mount

  // Sync equipped weapons with game engine when weapons or game engine changes
  useEffect(() => {
    if (!gameEngine || !gameStarted) return;

    console.log('[KnightGame] Syncing equipped weapons with game engine');
    const player = gameEngine.getPlayer();
    
    // Get the weapon for the currently active slot
    const activeWeapon = activeWeaponSlot === 1 ? equippedWeapons.mainhand : equippedWeapons.offhand;
    
    if (activeWeapon && activeWeapon.weaponId) {
      console.log(`[KnightGame] Equipping weapon: ${activeWeapon.name} in slot ${activeWeaponSlot}`);
      player.equipWeapon(activeWeapon.weaponId);
    } else {
      console.log(`[KnightGame] Unequipping weapon - slot ${activeWeaponSlot} is empty`);
      player.unequipWeapon();
    }
  }, [gameEngine, gameStarted, equippedWeapons, activeWeaponSlot]);

  // Wait for mount element to be ready
  useEffect(() => {
    console.log('[KnightGame] Checking if mount element is ready...');
    if (mountRef.current) {
      console.log('[KnightGame] Mount element is ready, setting mountReady to true');
      setMountReady(true);
    } else {
      console.log('[KnightGame] Mount element not ready yet');
      const timer = setTimeout(() => {
        if (mountRef.current) {
          console.log('[KnightGame] Mount element ready on retry');
          setMountReady(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handler for engine loading completion
  const handleEngineLoadingComplete = useCallback(() => {
    console.log('Engine loading completed, setting engineReady to true');
    setEngineReady(true);
    const engine = engineControllerRef.current?.getEngine();
    setGameEngine(engine || null);
    console.log('GameEngine instance set:', !!engine);
    onLoadingComplete?.();
  }, [onLoadingComplete, setEngineReady, setGameEngine]);

  // Toggle pause function
  const togglePause = useCallback(() => {
    if (gameEngine) {
      gameEngine.pause();
      setIsPaused(!isPaused);
    }
  }, [gameEngine, isPaused, setIsPaused]);

  // Notify GameEngine about UI state changes and manage cursor
  useEffect(() => {
    if (!gameEngine) return;
    
    const anyUIOpen = isAnyUIOpen();
    console.log(`🎮 [KnightGame] Notifying GameEngine - UI state: ${anyUIOpen ? 'OPEN' : 'CLOSED'}`);
    gameEngine.setUIState(anyUIOpen);
    
    if (anyUIOpen) {
      forceCursorVisible();
    } else {
      resetCursorForGame();
    }
  }, [gameEngine, isAnyUIOpen, forceCursorVisible, resetCursorForGame]);

  // Pointer lock management with UI state awareness
  useEffect(() => {
    if (!gameEngine || !gameStarted) return;

    const anyUIOpen = isAnyUIOpen();
    console.log('[KnightGame] Pointer lock management - UI open:', anyUIOpen);

    if (anyUIOpen) {
      console.log('[KnightGame] UI opened - releasing pointer lock');
      gameEngine.handleInput('requestPointerUnlock');
      
      setTimeout(() => {
        if (document.pointerLockElement) {
          console.log('[KnightGame] Retry: forcing pointer lock exit');
          try {
            document.exitPointerLock();
          } catch (error) {
            console.warn('[KnightGame] Retry pointer lock exit failed:', error);
          }
        }
        forceCursorVisible();
      }, 50);
      
      setTimeout(() => {
        if (document.pointerLockElement) {
          console.log('[KnightGame] Second retry: forcing pointer lock exit');
          try {
            document.exitPointerLock();
          } catch (error) {
            console.warn('[KnightGame] Second retry pointer lock exit failed:', error);
          }
        }
        forceCursorVisible();
      }, 200);
    } else {
      console.log('[KnightGame] All UIs closed - preparing to request pointer lock');
      setTimeout(() => {
        if (!isAnyUIOpen() && gameStarted && !isGameOver) {
          console.log('[KnightGame] Re-locking pointer after UI close');
          gameEngine.handleInput('requestPointerLock');
        } else {
          console.log('[KnightGame] Skipping pointer lock - UI state changed or game not active');
        }
      }, 100);
    }
  }, [gameEngine, gameStarted, isGameOver, isAnyUIOpen, forceCursorVisible]);

  const startGame = useCallback(() => {
    console.log('Starting knight adventure...');
    console.log('GameEngine available:', !!gameEngine);
    console.log('Starting with Steel Sword equipped in mainhand');
    
    if (gameEngine) {
      console.log('Starting GameEngine...');
      gameEngine.start();
      console.log('GameEngine started, isRunning:', gameEngine.isRunning());
    } else {
      console.error('GameEngine not available when trying to start game');
    }
    
    setGameStarted(true);
    setIsGameOver(false);
  }, [gameEngine, setGameStarted, setIsGameOver]);

  const restartGame = useCallback(() => {
    gameControllerRef.current?.restartGame();
    engineControllerRef.current?.restart();
    
    setGameStarted(true);
    setIsGameOver(false);
    setIsPaused(false);
  }, [setGameStarted, setIsGameOver, setIsPaused]);

  const goToMainMenu = useCallback(() => {
    gameControllerRef.current?.goToMainMenu();
    if (gameEngine) {
      gameEngine.pause();
    }
    setGameStarted(false);
    setIsGameOver(false);
    setIsPaused(false);
  }, [gameEngine, setGameStarted, setIsGameOver, setIsPaused]);

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
  }, [gameStarted, gameEngine, setPlayerStats, setGameTime, setIsGameOver]);

  // Use input handling hook with weapon slot selection
  useInputHandling({
    gameStarted,
    gameEngine,
    isAnyUIOpen,
    toggleInventory,
    toggleSkillTree,
    toggleQuestLog,
    toggleCrafting,
    toggleStatsPanel,
    closeAllUIs,
    togglePause,
    onWeaponSlotSelect: handleWeaponSlotSelect
  });

  // Show game menu until user clicks start
  if (!gameStarted && engineReady) {
    return <GameMenu onStartGame={startGame} />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Only render Engine Controller when mount element is ready */}
      {mountReady && (
        <GameEngineController
          ref={engineControllerRef}
          onUpdateHealth={handleUpdateHealth}
          onUpdateGold={handleUpdateGold}
          onUpdateStamina={handleUpdateStamina}
          onUpdateScore={handleUpdateScore}
          onGameOver={handleGameOver}
          onLocationChange={handleLocationChange}
          onLoadingComplete={handleEngineLoadingComplete}
          mountElement={mountRef.current}
        />
      )}
      
      {/* Simplified GameController - no longer manages inventory */}
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
          mainHandWeapon={equippedWeapons.mainhand}
          offHandWeapon={equippedWeapons.offhand}
          activeWeaponSlot={activeWeaponSlot}
          onWeaponSlotSelect={handleWeaponSlotSelect}
        />
      )}

      {/* Stats Panel Toggle Button */}
      {gameStarted && (
        <button 
          onClick={() => setShowStatsPanel(!showStatsPanel)}
          className="absolute left-4 top-28 z-10 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
          title="Press T to toggle stats panel"
        >
          Stats
        </button>
      )}

      {/* Game Control Panel */}
      {gameStarted && (
        <GameControlPanel
          isPaused={isPaused}
          onPauseToggle={togglePause}
          onRestart={restartGame}
          isGameOver={isGameOver}
        />
      )}

      {/* Player Stats Panel */}
      <PlayerStatsPanel
        playerStats={playerStats}
        isVisible={showStatsPanel}
        onClose={() => setShowStatsPanel(false)}
      />

      {/* Updated inventory system */}
      <InventorySystem
        items={inventory}
        isOpen={showInventory}
        onClose={toggleInventory}
        onUseItem={handleUseItem}
        onEquipWeapon={handleEquipWeapon}
        onUnequipWeapon={handleUnequipWeapon}
        equippedWeapons={equippedWeapons}
        onEquippedWeaponsChange={setEquippedWeapons}
      />

      <SkillTreeUI
        skills={gameControllerRef.current?.skills || []}
        isOpen={showSkillTree}
        onClose={toggleSkillTree}
        onUpgradeSkill={gameControllerRef.current?.handleUpgradeSkill || (() => {})}
        availablePoints={playerStats.level - 1}
      />

      <QuestLogUI
        quests={gameControllerRef.current?.quests || []}
        isOpen={showQuestLog}
        onClose={toggleQuestLog}
      />

      <CraftingUI
        recipes={[]}
        inventory={inventory}
        isOpen={showCrafting}
        onClose={toggleCrafting}
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
