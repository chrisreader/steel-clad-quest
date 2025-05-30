
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Item, Quest, Skill } from '../../types/GameTypes';
import { useGameState } from './hooks/useGameState';
import { useUIState } from './hooks/useUIState';
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

  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [mountReady, setMountReady] = useState(false);
  
  // Moved inventory state management to KnightGame (top level)
  const [inventory, setInventory] = useState<Item[]>([]);

  const gameControllerRef = useRef<GameControllerRef>(null);
  const engineControllerRef = useRef<GameEngineControllerRef>(null);

  // Use cursor management hook
  const { mountRef, forceCursorVisible, resetCursorForGame } = useCursorManagement({
    gameEngine,
    isAnyUIOpen
  });

  // Initialize inventory immediately on component mount (like normal games)
  useEffect(() => {
    console.log('[KnightGame] Initializing inventory on mount...');
    
    // Only the Steel Sword - the player's starting weapon
    const initialInventory: Item[] = [
      { 
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
      }
    ];

    setInventory(initialInventory);
    console.log('[KnightGame] Inventory initialized with Steel Sword only');
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
    console.log('Engine loading completed, setting engineReady to true');
    setEngineReady(true);
    const engine = engineControllerRef.current?.getEngine();
    setGameEngine(engine || null);
    console.log('GameEngine instance set:', !!engine);
    onLoadingComplete?.();
  }, [onLoadingComplete]);

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

  // Direct item use handler (simplified)
  const handleUseItem = useCallback((item: Item) => {
    console.log('[KnightGame] Using item:', item.name);
    
    if (item.type === 'potion' && item.name === 'Health Potion') {
      console.log(`Used ${item.name}`);
      if (gameEngine) {
        const player = gameEngine.getPlayer();
        player.heal(item.value);
        gameEngine.handleInput('playSound', { soundName: 'item_use' });
      }
    }
  }, [gameEngine]);

  const startGame = useCallback(() => {
    console.log('Starting knight adventure...');
    console.log('GameEngine available:', !!gameEngine);
    console.log('Inventory ready with', inventory.length, 'items');
    
    if (gameEngine) {
      console.log('Starting GameEngine...');
      gameEngine.start();
      console.log('GameEngine started, isRunning:', gameEngine.isRunning());
    } else {
      console.error('GameEngine not available when trying to start game');
    }
    
    setGameStarted(true);
    setIsGameOver(false);
  }, [gameEngine, inventory.length, setGameStarted, setIsGameOver]);

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

  // Show game menu until user clicks start
  if (!gameStarted && engineReady) {
    return <GameMenu onStartGame={startGame} />;
  }

  // Add weapon slot state
  const [activeWeaponSlot, setActiveWeaponSlot] = useState<1 | 2>(1);
  const [equippedWeapons, setEquippedWeapons] = useState<{
    mainhand: Item | null;
    offhand: Item | null;
  }>({
    mainhand: null,
    offhand: null
  });

  // Add weapon slot selection handler
  const handleWeaponSlotSelect = useCallback((slot: 1 | 2) => {
    console.log(`[KnightGame] Switching to weapon slot ${slot}`);
    setActiveWeaponSlot(slot);
    
    if (gameEngine) {
      // Switch to the weapon in the selected slot
      const targetWeapon = slot === 1 ? equippedWeapons.mainhand : equippedWeapons.offhand;
      if (targetWeapon && targetWeapon.weaponId) {
        const player = gameEngine.getPlayer();
        player.equipWeapon(targetWeapon.weaponId);
      }
    }
  }, [gameEngine, equippedWeapons]);

  // Enhanced weapon equip handler that updates equipped weapons state
  const handleEquipWeapon = useCallback((item: Item) => {
    console.log('[KnightGame] Equipping weapon:', item.name);
    
    if (gameEngine && item.weaponId) {
      const player = gameEngine.getPlayer();
      const success = player.equipWeapon(item.weaponId);
      
      if (success) {
        console.log(`Successfully equipped ${item.name}`);
        
        // Update equipped weapons state based on item's equipment slot
        if (item.equipmentSlot === 'mainhand') {
          setEquippedWeapons(prev => ({ ...prev, mainhand: item }));
        } else if (item.equipmentSlot === 'offhand') {
          setEquippedWeapons(prev => ({ ...prev, offhand: item }));
        }
        
        // Update player stats based on weapon
        if (item.stats) {
          const currentStats = player.getStats();
          const updatedStats = {
            ...currentStats,
            attack: currentStats.attack + (item.stats.attack || 0),
            attackPower: currentStats.attackPower + (item.stats.attack || 0)
          };
          setPlayerStats(updatedStats);
        }
      } else {
        console.error(`Failed to equip ${item.name}`);
      }
    }
  }, [gameEngine, setPlayerStats]);

  // Enhanced weapon unequip handler
  const handleUnequipWeapon = useCallback(() => {
    console.log('[KnightGame] Unequipping weapon');
    
    if (gameEngine) {
      const player = gameEngine.getPlayer();
      const success = player.unequipWeapon();
      
      if (success) {
        console.log('Weapon unequipped');
        // Clear the mainhand weapon (assuming unequip affects active weapon)
        setEquippedWeapons(prev => ({ ...prev, mainhand: null }));
        // Reset player stats
        const currentStats = player.getStats();
        setPlayerStats(currentStats);
      }
    }
  }, [gameEngine, setPlayerStats]);

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

      {/* Direct inventory management - no more complex callbacks */}
      <InventoryUI
        items={inventory}
        isOpen={showInventory}
        onClose={toggleInventory}
        onUseItem={handleUseItem}
        onEquipWeapon={handleEquipWeapon}
        onUnequipWeapon={handleUnequipWeapon}
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
