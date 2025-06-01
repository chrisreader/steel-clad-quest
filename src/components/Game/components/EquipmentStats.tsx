
import React from 'react';
import { Item, WeaponSlots } from '../../../types/GameTypes';

interface EquipmentStatsProps {
  equippedWeapons: WeaponSlots;
}

export const EquipmentStats: React.FC<EquipmentStatsProps> = ({ equippedWeapons }) => {
  // Calculate attack bonus from primary or secondary weapon (whichever has higher attack)
  const primaryAttack = equippedWeapons.primary?.stats?.attack || 0;
  const secondaryAttack = equippedWeapons.secondary?.stats?.attack || 0;
  const attackBonus = Math.max(primaryAttack, secondaryAttack);
  
  // Calculate defense bonus from offhand (shields will provide defense in the future)
  const defenseBonus = equippedWeapons.offhand?.stats?.defense || 0;

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
