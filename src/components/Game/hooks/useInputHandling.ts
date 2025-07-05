
import { useEffect, useCallback } from 'react';
import { GameEngine } from '../../../game/engine/GameEngine';

interface UseInputHandlingProps {
  gameStarted: boolean;
  gameEngine: GameEngine | null;
  isAnyUIOpen: () => boolean;
  toggleInventory: () => void;
  toggleSkillTree: () => void;
  toggleQuestLog: () => void;
  toggleCrafting: () => void;
  toggleStatsPanel: () => void;
  closeAllUIs: () => void;
  togglePause: () => void;
  onWeaponSlotSelect?: (slot: 1 | 2 | 3) => void;
}

export const useInputHandling = ({
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
  onWeaponSlotSelect
}: UseInputHandlingProps) => {

  // Listen for game input events (from mouse/keyboard handlers)
  useEffect(() => {
    const handleGameInput = (event: Event) => {
      if (!gameStarted || !gameEngine) return;

      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      console.log(`🎮 [useInputHandling] Received game input event: ${type}`, data);
      
      const anyUIOpen = isAnyUIOpen();
      if (anyUIOpen) {
        console.log(`🎮 [useInputHandling] UI is open, ignoring input: ${type}`);
        return;
      }

      switch (type) {
        case 'attack':
          console.log('🎮 [useInputHandling] *** ATTACK EVENT *** - calling gameEngine.handleInput("attack")');
          gameEngine.handleInput('attack');
          break;
        case 'attackEnd':
          console.log('🎮 [useInputHandling] *** ATTACK END EVENT *** - calling gameEngine.handleInput("attackEnd")');
          gameEngine.handleInput('attackEnd');
          break;
        case 'look':
          // Handle mouse look
          gameEngine.handleInput('look', data);
          break;
        default:
          // Handle other input types
          break;
      }
    };

    document.addEventListener('gameInput', handleGameInput);
    return () => document.removeEventListener('gameInput', handleGameInput);
  }, [gameStarted, gameEngine, isAnyUIOpen]);

  // Enhanced keyboard input handler with frame-rate independent timing
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      // Prevent default for game controls only when no UI is open
      const anyUIOpen = isAnyUIOpen();
      if (!anyUIOpen && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'Space':
          if (!anyUIOpen) {
            console.log('🎮 [useInputHandling] Space pressed - attacking via keyboard');
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
        case 'Digit1':
          if (!anyUIOpen && onWeaponSlotSelect) {
            console.log('🎮 [useInputHandling] 1 pressed - selecting weapon slot 1 (primary)');
            onWeaponSlotSelect(1);
          }
          break;
        case 'Digit2':
          if (!anyUIOpen && onWeaponSlotSelect) {
            console.log('🎮 [useInputHandling] 2 pressed - selecting weapon slot 2 (secondary)');
            onWeaponSlotSelect(2);
          }
          break;
        case 'Digit3':
          if (!anyUIOpen && onWeaponSlotSelect) {
            console.log('🎮 [useInputHandling] 3 pressed - selecting weapon slot 3 (offhand)');
            onWeaponSlotSelect(3);
          }
          break;
        case 'KeyI':
          console.log('[useInputHandling] I key pressed - toggling inventory');
          toggleInventory();
          break;
        case 'KeyK':
          console.log('[useInputHandling] K key pressed - toggling skill tree');
          toggleSkillTree();
          break;
        case 'KeyQ':
          console.log('[useInputHandling] Q key pressed - toggling quest log');
          toggleQuestLog();
          break;
        case 'KeyC':
          console.log('[useInputHandling] C key pressed - toggling crafting');
          toggleCrafting();
          break;
        case 'KeyT':
          console.log('[useInputHandling] T key pressed - toggling stats panel');
          toggleStatsPanel();
          break;
        case 'Escape':
          if (anyUIOpen) {
            console.log('[useInputHandling] Escape pressed - closing all UIs');
            closeAllUIs();
          } else {
            console.log('[useInputHandling] Escape pressed - toggling pause');
            togglePause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameEngine, isAnyUIOpen, toggleInventory, toggleSkillTree, toggleQuestLog, toggleCrafting, toggleStatsPanel, closeAllUIs, togglePause, onWeaponSlotSelect]);

  // Handle keyup events for movement
  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      // Only handle movement keys when no UI is open
      const anyUIOpen = isAnyUIOpen();
      if (anyUIOpen) return;

      // Handle key releases for movement
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
};
