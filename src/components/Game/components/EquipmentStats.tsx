
import React from 'react';
import { Item } from '../../../types/GameTypes';

interface EquipmentStatsProps {
  equippedWeapons: {
    mainhand: Item | null;
    offhand: Item | null;
  };
}

export const EquipmentStats: React.FC<EquipmentStatsProps> = ({ equippedWeapons }) => {
  const attackBonus = equippedWeapons.mainhand?.stats?.attack || 0;
  const defenseBonus = 0; // Weapons don't provide defense in this system

  return (
    <div className="mt-6 pt-4 border-t border-gray-700">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Equipment Bonuses</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-green-400">Attack: </span>
          <span>+{attackBonus}</span>
        </div>
        <div>
          <span className="text-blue-400">Defense: </span>
          <span>+{defenseBonus}</span>
        </div>
      </div>
    </div>
  );
};
