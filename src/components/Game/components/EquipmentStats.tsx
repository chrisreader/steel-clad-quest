
import React from 'react';
import { WeaponSlots } from '../hooks/useWeaponManagement';

interface EquipmentStatsProps {
  equippedWeapons: WeaponSlots;
}

export const EquipmentStats: React.FC<EquipmentStatsProps> = ({ equippedWeapons }) => {
  const primaryAttack = equippedWeapons.primary?.stats?.attack || 0;
  const secondaryAttack = equippedWeapons.secondary?.stats?.attack || 0;
  const offhandAttack = equippedWeapons.offhand?.stats?.attack || 0;
  
  // Calculate total attack bonus (could be based on active weapon or combined)
  const attackBonus = Math.max(primaryAttack, secondaryAttack, offhandAttack);
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
      
      {/* Show individual weapon stats */}
      <div className="mt-3 text-xs text-gray-500">
        {equippedWeapons.primary && (
          <div>Primary: +{equippedWeapons.primary.stats?.attack || 0} attack</div>
        )}
        {equippedWeapons.secondary && (
          <div>Secondary: +{equippedWeapons.secondary.stats?.attack || 0} attack</div>
        )}
        {equippedWeapons.offhand && (
          <div>Offhand: +{equippedWeapons.offhand.stats?.attack || 0} attack</div>
        )}
      </div>
    </div>
  );
};
