
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

  // Enhanced keyboard input handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameStarted || !gameEngine) return;

      console.log('Key pressed:', event.code, 'Game running:', gameEngine.isRunning());

      // Prevent default for game controls only when no UI is open
      const anyUIOpen = isAnyUIOpen();
      if (!anyUIOpen && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
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
        case 'Digit1':
          if (!anyUIOpen && onWeaponSlotSelect) {
            console.log('1 pressed - selecting primary weapon slot');
            onWeaponSlotSelect(1);
          }
          break;
        case 'Digit2':
          if (!anyUIOpen && onWeaponSlotSelect) {
            console.log('2 pressed - selecting secondary weapon slot');
            onWeaponSlotSelect(2);
          }
          break;
        case 'Digit3':
          if (!anyUIOpen && onWeaponSlotSelect) {
            console.log('3 pressed - selecting offhand weapon slot');
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
