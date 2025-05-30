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
import { PlayerStats, Item, Quest, Skill } from '../../types/GameTypes';

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
  const [mountReady, setMountReady] = useState(false);

  // UI state
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);

  const gameControllerRef = useRef<GameControllerRef>(null);
  const engineControllerRef = useRef<GameEngineControllerRef>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  // Wait for mount element to be ready
  useEffect(() => {
    console.log('[KnightGame] Checking if mount element is ready...');
    if (mountRef.current) {
      console.log('[KnightGame] Mount element is ready, setting mountReady to true');
      setMountReady(true);
    } else {
      console.log('[KnightGame] Mount element not ready yet');
      // Try again on next tick if not ready
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
    onLoadingComplete?.(); // Forward to parent to hide loading screen
  }, [onLoadingComplete]);

  // Check if any UI panel is currently open
  const isAnyUIOpen = useCallback(() => {
    const uiOpen = showInventory || showSkillTree || showQuestLog || showCrafting || showStatsPanel || isPaused;
    console.log('[KnightGame] UI state check:', {
      showInventory,
      showSkillTree,
      showQuestLog,
      showCrafting,
      showStatsPanel,
      isPaused,
      anyOpen: uiOpen
    });
    return uiOpen;
  }, [showInventory, showSkillTree, showQuestLog, showCrafting, showStatsPanel, isPaused]);

  // CRITICAL ADDITION: Force cursor visibility immediately when UI opens
  const forceCursorVisible = useCallback(() => {
    console.log('🖱️ [KnightGame] Forcing cursor to be visible and usable');
    
    // Apply multiple CSS properties to ensure cursor visibility
    const cursorStyles = {
      cursor: 'auto !important',
      pointerEvents: 'auto !important'
    };
    
    // Apply to body
    Object.assign(document.body.style, cursorStyles);
    
    // Apply to mount element
    if (mountRef.current) {
      Object.assign(mountRef.current.style, cursorStyles);
    }
    
    // Apply to canvas if it exists
    if (gameEngine) {
      const renderer = gameEngine.getRenderer();
      if (renderer && renderer.domElement) {
        Object.assign(renderer.domElement.style, cursorStyles);
      }
    }
    
    // Force immediate pointer lock exit as fallback
    try {
      if (document.pointerLockElement) {
        console.log('🖱️ [KnightGame] Forcing document.exitPointerLock() as fallback');
        document.exitPointerLock();
      }
    } catch (error) {
      console.warn('🖱️ [KnightGame] Fallback pointer lock exit failed:', error);
    }
    
    // Log current computed cursor style for debugging
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(document.body);
      console.log('🖱️ [KnightGame] Current cursor style:', computedStyle.cursor);
      console.log('🖱️ [KnightGame] Current pointer events:', computedStyle.pointerEvents);
    }, 100);
  }, [gameEngine]);

  const resetCursorForGame = useCallback(() => {
    console.log('🖱️ [KnightGame] Resetting cursor for game mode');
    
    // Reset cursor styles for game mode
    document.body.style.cursor = '';
    document.body.style.pointerEvents = '';
    
    if (mountRef.current) {
      mountRef.current.style.cursor = '';
      mountRef.current.style.pointerEvents = '';
    }
    
    // Reset canvas cursor if it exists
    if (gameEngine) {
      const renderer = gameEngine.getRenderer();
      if (renderer && renderer.domElement) {
        renderer.domElement.style.cursor = '';
        renderer.domElement.style.pointerEvents = '';
      }
    }
  }, [gameEngine]);

  // CRITICAL ADDITION: Notify GameEngine about UI state changes
  useEffect(() => {
    if (!gameEngine) return;
    
    const anyUIOpen = isAnyUIOpen();
    console.log(`🎮 [KnightGame] Notifying GameEngine - UI state: ${anyUIOpen ? 'OPEN' : 'CLOSED'}`);
    gameEngine.setUIState(anyUIOpen);
    
    // IMMEDIATE cursor forcing when UI opens
    if (anyUIOpen) {
      forceCursorVisible();
    } else {
      resetCursorForGame();
    }
  }, [gameEngine, isAnyUIOpen, forceCursorVisible, resetCursorForGame]);

  // Listen for pointer lock changes to apply cursor styles at the right time
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;
      console.log('🔒 [KnightGame] Pointer lock changed:', isLocked);
      
      if (!isLocked) {
        // Pointer was released - ensure cursor is visible
        console.log('🔒 [KnightGame] Pointer unlocked - making cursor visible');
        forceCursorVisible();
      } else {
        // Pointer was locked - hide cursor (if no UI is open)
        if (!isAnyUIOpen()) {
          console.log('🔒 [KnightGame] Pointer locked and no UI open - hiding cursor');
          resetCursorForGame();
        } else {
          // UI is open but pointer got locked somehow - force cursor visible
          console.log('🔒 [KnightGame] Pointer locked but UI is open - forcing cursor visible');
          forceCursorVisible();
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isAnyUIOpen, forceCursorVisible, resetCursorForGame]);

  // Pointer lock management with UI state awareness
  useEffect(() => {
    if (!gameEngine || !gameStarted) return;

    const anyUIOpen = isAnyUIOpen();
    console.log('[KnightGame] Pointer lock management - UI open:', anyUIOpen);

    if (anyUIOpen) {
      // Release pointer lock when any UI opens
      console.log('[KnightGame] UI opened - releasing pointer lock');
      gameEngine.handleInput('requestPointerUnlock');
      
      // Add retry mechanism for stubborn pointer locks
      setTimeout(() => {
        if (document.pointerLockElement) {
          console.log('[KnightGame] Retry: forcing pointer lock exit');
          try {
            document.exitPointerLock();
          } catch (error) {
            console.warn('[KnightGame] Retry pointer lock exit failed:', error);
          }
        }
        // Force cursor visible regardless
        forceCursorVisible();
      }, 50);
      
      // Second retry
      setTimeout(() => {
        if (document.pointerLockElement) {
          console.log('[KnightGame] Second retry: forcing pointer lock exit');
          try {
            document.exitPointerLock();
          } catch (error) {
            console.warn('[KnightGame] Second retry pointer lock exit failed:', error);
          }
        }
        // Force cursor visible regardless
        forceCursorVisible();
      }, 200);
    } else {
      // Request pointer lock when all UIs are closed (with small delay for smooth transition)
      console.log('[KnightGame] All UIs closed - preparing to request pointer lock');
      setTimeout(() => {
        // Double-check UI state hasn't changed
        if (!isAnyUIOpen() && gameStarted && !isGameOver) {
          console.log('[KnightGame] Re-locking pointer after UI close');
          gameEngine.handleInput('requestPointerLock');
        } else {
          console.log('[KnightGame] Skipping pointer lock - UI state changed or game not active');
        }
      }, 100);
    }
  }, [gameEngine, gameStarted, isGameOver, isAnyUIOpen, forceCursorVisible]);

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

  // Enhanced item use handler that connects both controllers
  const handleUseItem = useCallback((item: Item) => {
    // Call GameController method for game logic
    gameControllerRef.current?.handleUseItem(item);
    
    // Play sound effect through GameEngine
    if (gameEngine) {
      if (item.type === 'potion') {
        gameEngine.handleInput('playSound', { soundName: 'item_use' });
      }
    }
  }, [gameEngine]);

  // Enhanced skill upgrade handler
  const handleUpgradeSkill = useCallback((skill: Skill) => {
    // Call GameController method for skill logic
    gameControllerRef.current?.handleUpgradeSkill(skill);
    
    // Play upgrade sound effect
    if (gameEngine) {
      gameEngine.handleInput('playSound', { soundName: 'skill_upgrade' });
    }
  }, [gameEngine]);

  const startGame = useCallback(() => {
    console.log('Starting knight adventure...');
    console.log('GameEngine available:', !!gameEngine);
    
    if (gameEngine) {
      console.log('Starting GameEngine...');
      gameEngine.start(); // THIS WAS MISSING - start the actual game engine
      console.log('GameEngine started, isRunning:', gameEngine.isRunning());
    } else {
      console.error('GameEngine not available when trying to start game');
    }
    
    setGameStarted(true);
    setIsGameOver(false);
    gameControllerRef.current?.initializeSampleData();
  }, [gameEngine]);

  const togglePause = useCallback(() => {
    if (gameEngine) {
      gameEngine.pause();
      setIsPaused(!isPaused);
    }
  }, [gameEngine, isPaused]);

  const restartGame = useCallback(() => {
    // Restart both controllers
    gameControllerRef.current?.restartGame();
    engineControllerRef.current?.restart();
    
    setGameStarted(true);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  const goToMainMenu = useCallback(() => {
    gameControllerRef.current?.goToMainMenu();
    if (gameEngine) {
      gameEngine.pause();
    }
    setGameStarted(false);
    setIsGameOver(false);
    setIsPaused(false);
  }, [gameEngine]);

  // Enhanced keyboard input handler with improved UI management
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      console.log('Key pressed:', event.code, 'Game running:', gameEngine.isRunning());

      // Prevent default for game controls only when no UI is open
      const anyUIOpen = isAnyUIOpen();
      if (!anyUIOpen && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'Space':
          if (!anyUIOpen) {
            console.log('Space pressed - attacking');
            gameEngine.handleInput('attack');
          }
          break;
        case 'KeyW':
          if (!anyUIOpen) {
            console.log('W pressed - move forward');
            gameEngine.handleInput('moveForward');
          }
          break;
        case 'KeyS':
          if (!anyUIOpen) {
            console.log('S pressed - move backward');
            gameEngine.handleInput('moveBackward');
          }
          break;
        case 'KeyA':
          if (!anyUIOpen) {
            console.log('A pressed - move left');
            gameEngine.handleInput('moveLeft');
          }
          break;
        case 'KeyD':
          if (!anyUIOpen) {
            console.log('D pressed - move right');
            gameEngine.handleInput('moveRight');
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (!anyUIOpen) {
            console.log('Shift pressed - sprint');
            gameEngine.handleInput('sprint');
          }
          break;
        case 'KeyI':
          console.log('[KnightGame] I key pressed - toggling inventory');
          setShowInventory(!showInventory);
          break;
        case 'KeyK':
          console.log('[KnightGame] K key pressed - toggling skill tree');
          setShowSkillTree(!showSkillTree);
          break;
        case 'KeyQ':
          console.log('[KnightGame] Q key pressed - toggling quest log');
          setShowQuestLog(!showQuestLog);
          break;
        case 'KeyC':
          console.log('[KnightGame] C key pressed - toggling crafting');
          setShowCrafting(!showCrafting);
          break;
        case 'KeyT':
          console.log('[KnightGame] T key pressed - toggling stats panel');
          setShowStatsPanel(!showStatsPanel);
          break;
        case 'Escape':
          if (showInventory || showSkillTree || showQuestLog || showCrafting || showStatsPanel) {
            // Close all UIs
            console.log('[KnightGame] Escape pressed - closing all UIs');
            setShowInventory(false);
            setShowSkillTree(false);
            setShowQuestLog(false);
            setShowCrafting(false);
            setShowStatsPanel(false);
          } else {
            // Toggle pause menu
            console.log('[KnightGame] Escape pressed - toggling pause');
            togglePause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameEngine, showInventory, showSkillTree, showQuestLog, showCrafting, showStatsPanel, togglePause, isAnyUIOpen]);

  // Also handle keyup events for movement
  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      // Only handle movement keys when no UI is open
      const anyUIOpen = isAnyUIOpen();
      if (anyUIOpen) return;

      // Handle key releases for movement (this ensures movement stops when key is released)
      switch (event.code) {
        case 'KeyW':
        case 'KeyS':
        case 'KeyA':
        case 'KeyD':
        case 'ShiftLeft':
        case 'ShiftRight':
          console.log('Key released:', event.code);
          // The InputManager will handle the key release automatically
          break;
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [gameStarted, gameEngine, isAnyUIOpen]);

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
      {gameStarted && (
        <button 
          onClick={() => setShowStatsPanel(!showStatsPanel)}
          className="absolute left-4 top-28 z-10 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
          title="Press T to toggle stats panel"
        >
          Stats
        </button>
      )}

      {/* New Game Control Panel */}
      {gameStarted && (
        <GameControlPanel
          isPaused={isPaused}
          onPauseToggle={togglePause}
          onRestart={restartGame}
          isGameOver={isGameOver}
        />
      )}

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
        onUseItem={handleUseItem}
      />

      <SkillTreeUI
        skills={gameControllerRef.current?.skills || []}
        isOpen={showSkillTree}
        onClose={() => setShowSkillTree(false)}
        onUpgradeSkill={handleUpgradeSkill}
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
