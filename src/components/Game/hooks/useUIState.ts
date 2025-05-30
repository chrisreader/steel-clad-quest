
import { useState, useCallback } from 'react';

export const useUIState = () => {
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // Check if any UI panel is currently open
  const isAnyUIOpen = useCallback(() => {
    const uiOpen = showInventory || showSkillTree || showQuestLog || showCrafting || showStatsPanel;
    console.log('[useUIState] UI state check:', {
      showInventory,
      showSkillTree,
      showQuestLog,
      showCrafting,
      showStatsPanel,
      anyOpen: uiOpen
    });
    return uiOpen;
  }, [showInventory, showSkillTree, showQuestLog, showCrafting, showStatsPanel]);

  // Close all UI panels
  const closeAllUIs = useCallback(() => {
    console.log('[useUIState] Closing all UIs');
    setShowInventory(false);
    setShowSkillTree(false);
    setShowQuestLog(false);
    setShowCrafting(false);
    setShowStatsPanel(false);
  }, []);

  // Toggle functions
  const toggleInventory = useCallback(() => {
    console.log('[useUIState] Toggling inventory');
    setShowInventory(prev => !prev);
  }, []);

  const toggleSkillTree = useCallback(() => {
    console.log('[useUIState] Toggling skill tree');
    setShowSkillTree(prev => !prev);
  }, []);

  const toggleQuestLog = useCallback(() => {
    console.log('[useUIState] Toggling quest log');
    setShowQuestLog(prev => !prev);
  }, []);

  const toggleCrafting = useCallback(() => {
    console.log('[useUIState] Toggling crafting');
    setShowCrafting(prev => !prev);
  }, []);

  const toggleStatsPanel = useCallback(() => {
    console.log('[useUIState] Toggling stats panel');
    setShowStatsPanel(prev => !prev);
  }, []);

  return {
    // State
    showInventory,
    showSkillTree,
    showQuestLog,
    showCrafting,
    showStatsPanel,
    
    // Setters
    setShowInventory,
    setShowSkillTree,
    setShowQuestLog,
    setShowCrafting,
    setShowStatsPanel,
    
    // Utilities
    isAnyUIOpen,
    closeAllUIs,
    
    // Toggles
    toggleInventory,
    toggleSkillTree,
    toggleQuestLog,
    toggleCrafting,
    toggleStatsPanel
  };
};
