import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';

interface ChestInteractionPromptProps {
  className?: string;
}

interface ChestInteractionEvent {
  show: boolean;
  chestType?: 'common' | 'rare';
}

interface ChestOpenedEvent {
  chestType: 'common' | 'rare';
  loot: {
    gold: number;
    items?: string[];
  };
}

export const ChestInteractionPrompt: React.FC<ChestInteractionPromptProps> = ({ className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [chestType, setChestType] = useState<'common' | 'rare'>('common');
  const [showLootMessage, setShowLootMessage] = useState(false);
  const [lastLoot, setLastLoot] = useState<ChestOpenedEvent['loot'] | null>(null);

  useEffect(() => {
    const handleChestInteraction = (event: Event) => {
      const customEvent = event as CustomEvent<ChestInteractionEvent>;
      const { show, chestType: type } = customEvent.detail;
      
      setIsVisible(show);
      if (type) {
        setChestType(type);
      }
    };

    const handleChestOpened = (event: Event) => {
      const customEvent = event as CustomEvent<ChestOpenedEvent>;
      const { loot } = customEvent.detail;
      
      setLastLoot(loot);
      setShowLootMessage(true);
      setIsVisible(false);
      
      // Hide loot message after 3 seconds
      setTimeout(() => {
        setShowLootMessage(false);
        setLastLoot(null);
      }, 3000);
    };

    document.addEventListener('chestInteraction', handleChestInteraction);
    document.addEventListener('chestOpened', handleChestOpened);

    return () => {
      document.removeEventListener('chestInteraction', handleChestInteraction);
      document.removeEventListener('chestOpened', handleChestOpened);
    };
  }, []);

  if (!isVisible && !showLootMessage) {
    return null;
  }

  return (
    <div className={cn(
      "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50",
      className
    )}>
      {isVisible && (
        <div className="bg-background/90 border border-border rounded-lg px-6 py-3 backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              chestType === 'rare' ? "bg-yellow-500" : "bg-amber-600"
            )} />
            <div className="text-sm font-medium text-foreground">
              Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">E</kbd> to open {chestType} chest
            </div>
          </div>
        </div>
      )}
      
      {showLootMessage && lastLoot && (
        <div className="bg-green-900/90 border border-green-700 rounded-lg px-6 py-3 backdrop-blur-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="text-sm font-medium text-green-100">
              Found {lastLoot.gold} gold!
              {lastLoot.items && lastLoot.items.length > 0 && (
                <div className="text-xs text-green-200 mt-1">
                  {lastLoot.items.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};