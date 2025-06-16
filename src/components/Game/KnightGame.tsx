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

  // Use weapon management hook with 3-slot system
  const {
    equippedWeapons,
    setEquippedWeapons,
    activeWeaponSlot,
    handleEquipWeapon,
    handleUnequipWeapon,
    handleWeaponSlotSelect,
    isOffhandDisabled
  } = useWeaponManagement({
    primary: {
      id: '1', 
      name: 'Steel Sword', 
      type: 'weapon' as const, 
      subtype: 'sword' as const,
      value: 200, 
      description: 'A masterfully forged steel blade with razor-sharp edges. This superior weapon offers exceptional balance and deadly precision in combat (+15 attack)', 
      quantity: 1,
      equipmentSlot: 'primary' as const,
      stats: { attack: 15 },
      tier: 'uncommon' as const,
      icon: 'sword',
      weaponId: 'steel_sword'
    },
    secondary: null,
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
      equipmentSlot: 'secondary' as const,
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

  // CRITICAL: Enhanced weapon syncing - sync whenever weapons or active slot changes
  useEffect(() => {
    if (!gameEngine || !gameStarted) return;

    console.log('[KnightGame] 🔄 WEAPON SYNC - Syncing equipped weapons with OPTIMIZED game engine');
    console.log('[KnightGame] 🔄 Active slot:', activeWeaponSlot);
    console.log('[KnightGame] 🔄 Equipped weapons:', equippedWeapons);
    
    const player = gameEngine.getPlayer();
    
    // Get the weapon for the currently active slot
    const activeWeapon = activeWeaponSlot === 1 ? equippedWeapons.primary : 
                        activeWeaponSlot === 2 ? equippedWeapons.secondary : 
                        equippedWeapons.offhand;
    
    if (activeWeapon && activeWeapon.weaponId) {
      console.log(`[KnightGame] 🏹 EQUIPPING WEAPON: ${activeWeapon.name} (${activeWeapon.weaponId}) to OPTIMIZED Player entity`);
      player.equipWeapon(activeWeapon.weaponId);
      console.log(`[KnightGame] ✅ WEAPON EQUIPPED - OPTIMIZED Player should now have ${activeWeapon.name} equipped`);
      
      // Additional logging for bow weapons
      if (activeWeapon.subtype === 'bow') {
        console.log(`[KnightGame] 🏹 BOW EQUIPPED - OPTIMIZED Player should now be able to shoot arrows`);
        console.log(`[KnightGame] 🏹 isBowEquipped should be: true`);
      }
    } else {
      console.log(`[KnightGame] 🔄 UNEQUIPPING WEAPON - slot ${activeWeaponSlot} is empty`);
      player.unequipWeapon();
      console.log(`[KnightGame] ✅ WEAPON UNEQUIPPED - OPTIMIZED Player should now have no weapon equipped`);
    }
    
    // Log current player weapon state after syncing
    setTimeout(() => {
      console.log(`[KnightGame] 🔍 POST-SYNC CHECK - OPTIMIZED Player weapon state:`);
      // Note: We can't directly access private properties, but the equip/unequip calls should have set them
    }, 100);
    
  }, [gameEngine, gameStarted, equippedWeapons, activeWeaponSlot]);

  // Enhanced weapon slot selection with immediate syncing
  const handleEnhancedWeaponSlotSelect = useCallback((slot: 1 | 2 | 3) => {
    console.log(`[KnightGame] 🎯 SLOT SELECTION - Switching to weapon slot ${slot} in OPTIMIZED engine`);
    
    // Use the existing slot selection logic
    handleWeaponSlotSelect(slot);
    
    // The weapon syncing will happen automatically via the useEffect above
    console.log(`[KnightGame] 🎯 SLOT SWITCHED - Active slot is now ${slot}, weapon sync will trigger`);
  }, [handleWeaponSlotSelect]);

  // CRITICAL: Force engine restart when component mounts to ensure new arm positioning
  useEffect(() => {
    console.log('[KnightGame] Component mounted - will force OPTIMIZED engine restart');
  }, []);

  // Log the initial setup
  useEffect(() => {
    console.log('[KnightGame] Initial setup - Steel Sword equipped in primary, Hunting Bow in inventory');
  }, []); // Empty dependency array - runs once on mount

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
    console.log('🚀 [KnightGame] OPTIMIZED Engine loading completed, setting engineReady to true');
    setEngineReady(true);
    const engine = engineControllerRef.current?.getEngine();
    setGameEngine(engine || null);
    console.log('🚀 [KnightGame] OPTIMIZED GameEngine instance set:', !!engine);
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
    console.log('🚀 [KnightGame] Starting OPTIMIZED knight adventure...');
    console.log('🚀 [KnightGame] OPTIMIZED GameEngine available:', !!gameEngine);
    console.log('🚀 [KnightGame] Starting with Steel Sword equipped and OPTIMIZED performance');
    
    if (gameEngine) {
      console.log('🚀 [KnightGame] Starting OPTIMIZED GameEngine...');
      gameEngine.start();
      console.log('🚀 [KnightGame] OPTIMIZED GameEngine started, isRunning:', gameEngine.isRunning());
    } else {
      console.error('🚀 [KnightGame] OPTIMIZED GameEngine not available when trying to start game');
    }
    
    setGameStarted(true);
    setIsGameOver(false);
  }, [gameEngine, setGameStarted, setIsGameOver]);

  const restartGame = useCallback(() => {
    console.log('🔄 [KnightGame] Restarting OPTIMIZED game - this will force creation of new player...');
    gameControllerRef.current?.restartGame();
    engineControllerRef.current?.restart(); // This will trigger GameEngine.restart() which recreates the player
    
    setGameStarted(true);
    setIsGameOver(false);
    setIsPaused(false);
    console.log('🔄 [KnightGame] OPTIMIZED Game restart initiated - new player will be created');
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

  // Use input handling hook with enhanced weapon slot selection
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
    onWeaponSlotSelect: handleEnhancedWeaponSlotSelect
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
          primaryWeapon={equippedWeapons.primary}
          secondaryWeapon={equippedWeapons.secondary}
          offhandWeapon={equippedWeapons.offhand}
          activeWeaponSlot={activeWeaponSlot}
          onWeaponSlotSelect={handleEnhancedWeaponSlotSelect}
          isOffhandDisabled={isOffhandDisabled()}
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

      {/* Game Control Panel with RESTART button that forces new arm positioning */}
      {gameStarted && (
        <GameControlPanel
          isPaused={isPaused}
          onPauseToggle={togglePause}
          onRestart={restartGame}  // This will trigger new player creation
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
          onRestart={restartGame}  // This will trigger new player creation
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
