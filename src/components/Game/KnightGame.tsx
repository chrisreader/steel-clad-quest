import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameHUD } from './UI/GameHUD';
import { GameOverScreen } from './UI/GameOverScreen';
import { GameMenu } from './UI/GameMenu';
import { GameControls } from './UI/GameControls';
import { InventorySystem } from './systems/InventorySystem';
import { DualInventoryView } from './UI/DualInventoryView';
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
    setInventory,
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
    primary: null,
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
    // Adding hunting bow to starting inventory
    // The inventory will be updated through the useGameManager hook
  }, []);

  // Chest interaction state
  const [chestUIState, setChestUIState] = useState({
    isOpen: false,
    chestItems: [] as Item[],
    chestType: 'common' as 'common' | 'rare'
  });

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

      const player = gameEngine.getPlayer();
      if (!player) return; // Add null check to prevent error
      
      // Get the weapon for the currently active slot
      const activeWeapon = activeWeaponSlot === 1 ? equippedWeapons.primary : 
                          activeWeaponSlot === 2 ? equippedWeapons.secondary : 
                          equippedWeapons.offhand;
      
      if (activeWeapon && activeWeapon.weaponId) {
        player.equipWeapon(activeWeapon.weaponId);
      } else {
        player.unequipWeapon();
      }
      
    }, [gameEngine, gameStarted, equippedWeapons, activeWeaponSlot]);

  // Enhanced weapon slot selection with immediate syncing
  const handleEnhancedWeaponSlotSelect = useCallback((slot: 1 | 2 | 3) => {
    // Use the existing slot selection logic
    handleWeaponSlotSelect(slot);
    
    // The weapon syncing will happen automatically via the useEffect above
  }, [handleWeaponSlotSelect]);

  // CRITICAL: Force engine restart when component mounts to ensure new arm positioning
  useEffect(() => {
    // Component mounted - silent mode
  }, []);

  // Initial setup
  useEffect(() => {
    // Initial setup - silent mode
  }, []); // Empty dependency array - runs once on mount

  // Wait for mount element to be ready
  useEffect(() => {
    if (mountRef.current) {
      setMountReady(true);
    } else {
      const timer = setTimeout(() => {
        if (mountRef.current) {
          setMountReady(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handler for engine loading completion
  const handleEngineLoadingComplete = useCallback(() => {
    setEngineReady(true);
    const engine = engineControllerRef.current?.getEngine();
    setGameEngine(engine || null);
    
    // Set up chest callbacks
    if (engine) {
      const chestSystem = (engine as any).chestInteractionSystem;
      if (chestSystem) {
        chestSystem.setChestOpenCallback((chest: any, loot: any) => {
          setChestUIState({
            isOpen: true,
            chestItems: loot.items,
            chestType: chest.getType()
          });
        });
      }
    }
    
    onLoadingComplete?.();
  }, [onLoadingComplete, setEngineReady, setGameEngine]);

  // Chest interaction handlers
  const handleCloseChest = useCallback(() => {
    setChestUIState({
      isOpen: false,
      chestItems: [],
      chestType: 'common'
    });
  }, []);

  const handleTakeItem = useCallback((item: Item, index: number) => {
    // Add item to player inventory
    // Remove from chest items
    setChestUIState(prev => ({
      ...prev,
      chestItems: prev.chestItems.filter((_, i) => i !== index)
    }));
  }, []);

  const handleTakeAll = useCallback(() => {
    // Add all items to player inventory here
    setChestUIState({
      isOpen: false,
      chestItems: [],
      chestType: 'common'
    });
  }, []);

  // Inventory management functions that actually update the inventory
  const handleAddItemToInventory = useCallback((item: Item, targetSlot?: number) => {
    const currentInventory = [...inventory];
    
    if (targetSlot !== undefined) {
      // Place item in specific slot
      const existingItem = currentInventory[targetSlot];
      if (existingItem) {
        // If slot is occupied, try to find an empty slot for the displaced item
        const emptySlotIndex = currentInventory.findIndex((slot, index) => 
          index !== targetSlot && (slot === undefined || slot === null)
        );
        if (emptySlotIndex !== -1) {
          currentInventory[emptySlotIndex] = existingItem;
        } else {
          // If no empty slot, add displaced item to end
          currentInventory.push(existingItem);
        }
      }
      currentInventory[targetSlot] = item;
      setInventory(currentInventory);
      console.log('💰 [KnightGame] Item placed in slot', targetSlot);
    } else {
      // Original logic for auto-placement
      const emptySlotIndex = currentInventory.findIndex(slot => slot === undefined || slot === null);
      if (emptySlotIndex !== -1) {
        currentInventory[emptySlotIndex] = item;
        setInventory(currentInventory);
        console.log('💰 [KnightGame] Item added to slot', emptySlotIndex);
      } else {
        currentInventory.push(item);
        setInventory(currentInventory);
        console.log('💰 [KnightGame] Item added to end of inventory');
      }
    }
  }, [inventory, setInventory]);

  const handleRemoveItemFromInventory = useCallback((index: number) => {
    console.log('💰 [KnightGame] Removing item from inventory at index:', index);
    const currentInventory = [...inventory];
    currentInventory.splice(index, 1); // Remove the item
    setInventory(currentInventory);
  }, [inventory, setInventory]);

  const handleMoveItemInInventory = useCallback((fromIndex: number, toIndex: number) => {
    console.log('💰 [KnightGame] Moving item in inventory from', fromIndex, 'to', toIndex);
    const currentInventory = [...inventory];
    const fromItem = currentInventory[fromIndex];
    const toItem = currentInventory[toIndex];
    
    // Swap items
    currentInventory[fromIndex] = toItem;
    currentInventory[toIndex] = fromItem;
    setInventory(currentInventory);
  }, [inventory, setInventory]);

  // Toggle pause function
  const togglePause = useCallback(() => {
    if (gameEngine) {
      gameEngine.pause();
      setIsPaused(!isPaused);
    }
  }, [gameEngine, isPaused, setIsPaused]);

  // Notify GameEngine about UI state changes and manage cursor (include chest UI)
  useEffect(() => {
    if (!gameEngine) return;
    
    const anyUIOpen = isAnyUIOpen() || chestUIState.isOpen;
    console.log(`🎮 [KnightGame] Notifying GameEngine - UI state: ${anyUIOpen ? 'OPEN' : 'CLOSED'} (chest: ${chestUIState.isOpen})`);
    gameEngine.setUIState(anyUIOpen);
    
    if (anyUIOpen) {
      forceCursorVisible();
    } else {
      resetCursorForGame();
    }
  }, [gameEngine, isAnyUIOpen, forceCursorVisible, resetCursorForGame, chestUIState.isOpen]);

  // Pointer lock management with UI state awareness (include chest UI)
  useEffect(() => {
    if (!gameEngine || !gameStarted) return;

    const anyUIOpen = isAnyUIOpen() || chestUIState.isOpen;
    console.log('[KnightGame] Pointer lock management - UI open:', anyUIOpen, '(chest:', chestUIState.isOpen, ')');

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
        if (!isAnyUIOpen() && !chestUIState.isOpen && gameStarted && !isGameOver) {
          console.log('[KnightGame] Re-locking pointer after UI close');
          gameEngine.handleInput('requestPointerLock');
        } else {
          console.log('[KnightGame] Skipping pointer lock - UI state changed or game not active');
        }
      }, 100);
    }
  }, [gameEngine, gameStarted, isGameOver, isAnyUIOpen, forceCursorVisible, chestUIState.isOpen]);

  const startGame = useCallback(() => {
    console.log('🚀 [KnightGame] Starting knight adventure with NEW ARM POSITIONING...');
    console.log('🚀 [KnightGame] GameEngine available:', !!gameEngine);
    console.log('🚀 [KnightGame] Starting with Steel Sword equipped in primary and NEW ARM POSITIONING');
    
    if (gameEngine) {
      console.log('🚀 [KnightGame] Starting GameEngine with NEW ARM POSITIONING...');
      gameEngine.start();
      console.log('🚀 [KnightGame] GameEngine started with NEW ARM POSITIONING, isRunning:', gameEngine.isRunning());
    } else {
      console.error('🚀 [KnightGame] GameEngine not available when trying to start game');
    }
    
    setGameStarted(true);
    setIsGameOver(false);
  }, [gameEngine, setGameStarted, setIsGameOver]);

  const restartGame = useCallback(() => {
    console.log('🔄 [KnightGame] Restarting game - this will force creation of new player with NEW ARM POSITIONING...');
    gameControllerRef.current?.restartGame();
    engineControllerRef.current?.restart(); // This will trigger GameEngine.restart() which recreates the player
    
    setGameStarted(true);
    setIsGameOver(false);
    setIsPaused(false);
    console.log('🔄 [KnightGame] Game restart initiated - new player will be created with NEW ARM POSITIONING');
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

      {/* Chest Inventory UI */}
      <DualInventoryView
        isOpen={chestUIState.isOpen}
        chestItems={chestUIState.chestItems}
        chestType={chestUIState.chestType}
        onCloseChest={handleCloseChest}
        onTakeItem={handleTakeItem}
        onTakeAll={handleTakeAll}
        playerItems={inventory}
        onUseItem={handleUseItem}
        onAddItemToInventory={handleAddItemToInventory}
        onRemoveItemFromInventory={handleRemoveItemFromInventory}
        onMoveItemInInventory={handleMoveItemInInventory}
        equippedWeapons={equippedWeapons}
        onEquippedWeaponsChange={setEquippedWeapons}
        onEquipWeapon={handleEquipWeapon}
        onUnequipWeapon={handleUnequipWeapon}
      />
    </div>
  );
};
