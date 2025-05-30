
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../ui/hover-card';

interface ItemTooltipProps {
  item: Item;
  children: React.ReactNode;
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, children }) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'common': return 'text-gray-300';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  const getTierBorder = (tier: string) => {
    switch (tier) {
      case 'common': return 'border-gray-500';
      case 'uncommon': return 'border-green-500';
      case 'rare': return 'border-blue-500';
      case 'epic': return 'border-purple-500';
      case 'legendary': return 'border-yellow-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className={`w-80 bg-gray-900 border-2 ${getTierBorder(item.tier)} text-white p-4`}
        side="right"
        sideOffset={10}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-lg ${getTierColor(item.tier)}`}>
              {item.name}
            </h3>
            {item.quantity > 1 && (
              <span className="text-sm text-gray-400">
                x{item.quantity}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-400 capitalize">
            {item.type} {item.subtype && `• ${item.subtype}`}
          </div>
          
          <p className="text-sm text-gray-200 leading-relaxed">
            {item.description}
          </p>
          
          {item.stats && (
            <div className="border-t border-gray-700 pt-2">
              <div className="text-sm font-semibold text-gray-300 mb-1">Stats:</div>
              <div className="space-y-1">
                {item.stats.attack && (
                  <div className="flex justify-between">
                    <span className="text-red-400">Attack:</span>
                    <span className="text-green-400">+{item.stats.attack}</span>
                  </div>
                )}
                {item.stats.defense && (
                  <div className="flex justify-between">
                    <span className="text-blue-400">Defense:</span>
                    <span className="text-green-400">+{item.stats.defense}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Value:</span>
              <span className="text-yellow-400">{item.value} gold</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
