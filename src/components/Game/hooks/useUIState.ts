
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

  // Toggle functions
  const toggleInventory = useCallback(() => setShowInventory(prev => !prev), []);
  const toggleSkillTree = useCallback(() => setShowSkillTree(prev => !prev), []);
  const toggleQuestLog = useCallback(() => setShowQuestLog(prev => !prev), []);
  const toggleCrafting = useCallback(() => setShowCrafting(prev => !prev), []);
  const toggleStatsPanel = useCallback(() => setShowStatsPanel(prev => !prev), []);

  // Close all UIs
  const closeAllUIs = useCallback(() => {
    setShowInventory(false);
    setShowSkillTree(false);
    setShowQuestLog(false);
    setShowCrafting(false);
    setShowStatsPanel(false);
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
    
    // Helpers
    isAnyUIOpen,
    toggleInventory,
    toggleSkillTree,
    toggleQuestLog,
    toggleCrafting,
    toggleStatsPanel,
    closeAllUIs
  };
};
