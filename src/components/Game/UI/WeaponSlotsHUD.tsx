
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { Sword, Shield } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

interface WeaponSlotsHUDProps {
  mainHandWeapon: Item | null;
  offHandWeapon: Item | null;
  activeSlot: 1 | 2;
  onSlotSelect: (slot: 1 | 2) => void;
}

export const WeaponSlotsHUD: React.FC<WeaponSlotsHUDProps> = ({
  mainHandWeapon,
  offHandWeapon,
  activeSlot,
  onSlotSelect
}) => {
  const getWeaponIcon = (weapon: Item | null) => {
    if (!weapon) return null;
    
    switch (weapon.subtype) {
      case 'sword':
        return <Sword className="w-6 h-6 text-yellow-400" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-gray-400" />;
      default:
        return (
          <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-xs font-bold text-white">
            {weapon.name.charAt(0).toUpperCase()}
          </div>
        );
    }
  };

  const renderWeaponSlot = (slotNumber: 1 | 2, weapon: Item | null, label: string) => {
    const isActive = activeSlot === slotNumber;
    
    const slotContent = (
      <div
        className={`
          relative w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer
          transition-all duration-200
          ${weapon 
            ? 'border-gray-500 bg-gray-700 hover:bg-gray-600' 
            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }
          ${isActive 
            ? 'ring-2 ring-blue-400 ring-opacity-75 border-blue-400 shadow-lg shadow-blue-400/50' 
            : ''
          }
        `}
        onClick={() => onSlotSelect(slotNumber)}
        title={weapon ? weapon.name : `Empty ${label}`}
      >
        {weapon ? getWeaponIcon(weapon) : (
          <div className="w-6 h-6 border-2 border-gray-600 rounded-sm transform rotate-45" />
        )}
        
        {/* Hotkey indicator */}
        <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 flex items-center justify-center">
          {slotNumber}
        </div>
        
        {/* Active slot indicator */}
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-blue-400 rounded-full"></div>
        )}
      </div>
    );

    // Wrap with tooltip if there's a weapon
    if (weapon) {
      return <ItemTooltip key={slotNumber} item={weapon}>{slotContent}</ItemTooltip>;
    }

    return <div key={slotNumber}>{slotContent}</div>;
  };

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <div className="bg-black bg-opacity-50 rounded-lg p-3">
        <div className="text-xs text-gray-300 mb-2 text-center">Weapons</div>
        <div className="flex gap-2">
          {renderWeaponSlot(1, mainHandWeapon, 'Main Hand')}
          {renderWeaponSlot(2, offHandWeapon, 'Off Hand')}
        </div>
        <div className="text-xs text-gray-400 mt-1 text-center">Press 1-2</div>
      </div>
    </div>
  );
};
