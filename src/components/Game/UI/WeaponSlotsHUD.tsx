
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { Sword, Shield, Target } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

interface WeaponSlotsHUDProps {
  primaryWeapon: Item | null;
  secondaryWeapon: Item | null;
  offhandWeapon: Item | null;
  activeSlot: 1 | 2 | 3;
  onSlotSelect: (slot: 1 | 2 | 3) => void;
  isOffhandDisabled?: boolean;
}

export const WeaponSlotsHUD: React.FC<WeaponSlotsHUDProps> = ({
  primaryWeapon,
  secondaryWeapon,
  offhandWeapon,
  activeSlot,
  onSlotSelect,
  isOffhandDisabled = false
}) => {
  const getWeaponIcon = (weapon: Item | null) => {
    if (!weapon) return null;
    
    switch (weapon.subtype) {
      case 'sword':
        return <Sword className="w-6 h-6 text-yellow-400" />;
      case 'bow':
        return <Target className="w-6 h-6 text-green-400" />;
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

  const renderWeaponSlot = (slotNumber: 1 | 2 | 3, weapon: Item | null, label: string) => {
    const isActive = activeSlot === slotNumber;
    const isDisabled = slotNumber === 3 && isOffhandDisabled;
    
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
          ${isDisabled 
            ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-900' 
            : ''
          }
        `}
        onClick={() => !isDisabled && onSlotSelect(slotNumber)}
        title={weapon ? weapon.name : `Empty ${label}${isDisabled ? ' (Disabled)' : ''}`}
      >
        {weapon ? getWeaponIcon(weapon) : (
          <div className="w-6 h-6 border-2 border-gray-600 rounded-sm transform rotate-45" />
        )}
        
        {/* Hotkey indicator */}
        <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 flex items-center justify-center">
          {slotNumber}
        </div>
        
        {/* Active slot indicator */}
        {isActive && !isDisabled && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-blue-400 rounded-full"></div>
        )}
        
        {/* Disabled indicator */}
        {isDisabled && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-0.5 bg-red-500 rounded transform rotate-45"></div>
          </div>
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
          {renderWeaponSlot(1, primaryWeapon, 'Primary')}
          {renderWeaponSlot(2, secondaryWeapon, 'Secondary')}
          {renderWeaponSlot(3, offhandWeapon, 'Offhand')}
        </div>
        <div className="text-xs text-gray-400 mt-1 text-center">Press 1-3</div>
      </div>
    </div>
  );
};
