
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { Sword, Shield, Target, Ban } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

interface WeaponSlotsHUDProps {
  primaryWeapon: Item | null;
  secondaryWeapon: Item | null;
  offhandWeapon: Item | null;
  activeSlot: 1 | 2 | 3;
  isOffhandDisabled: boolean;
  onSlotSelect: (slot: 1 | 2 | 3) => void;
}

export const WeaponSlotsHUD: React.FC<WeaponSlotsHUDProps> = ({
  primaryWeapon,
  secondaryWeapon,
  offhandWeapon,
  activeSlot,
  isOffhandDisabled,
  onSlotSelect
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

  const getWeaponBadge = (weapon: Item | null) => {
    if (!weapon) return null;
    
    // Show 2H badge for two-handed weapons
    if (weapon.subtype === 'bow') {
      return (
        <div className="absolute -top-1 -right-1 w-6 h-4 bg-red-600 border border-red-500 rounded text-xs text-white flex items-center justify-center font-bold">
          2H
        </div>
      );
    }
    
    return null;
  };

  const renderWeaponSlot = (slotNumber: 1 | 2 | 3, weapon: Item | null, label: string, disabled: boolean = false) => {
    const isActive = activeSlot === slotNumber;
    
    const slotContent = (
      <div
        className={`
          relative w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer
          transition-all duration-200
          ${disabled 
            ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed' 
            : weapon 
              ? 'border-gray-500 bg-gray-700 hover:bg-gray-600' 
              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }
          ${isActive 
            ? 'ring-2 ring-blue-400 ring-opacity-75 border-blue-400 shadow-lg shadow-blue-400/50' 
            : ''
          }
        `}
        onClick={() => !disabled && onSlotSelect(slotNumber)}
        title={disabled ? `${label} (Disabled by 2H weapon)` : weapon ? weapon.name : `Empty ${label}`}
      >
        {disabled && !weapon ? (
          <Ban className="w-6 h-6 text-gray-600" />
        ) : weapon ? (
          getWeaponIcon(weapon)
        ) : (
          <div className="w-6 h-6 border-2 border-gray-600 rounded-sm transform rotate-45" />
        )}
        
        {/* Weapon type badge */}
        {getWeaponBadge(weapon)}
        
        {/* Hotkey indicator */}
        <div className={`absolute -top-2 -left-2 w-5 h-5 border border-gray-600 rounded text-xs flex items-center justify-center ${
          disabled ? 'bg-gray-800 text-gray-600' : 'bg-gray-900 text-gray-300'
        }`}>
          {slotNumber}
        </div>
        
        {/* Active slot indicator */}
        {isActive && !disabled && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-blue-400 rounded-full"></div>
        )}
        
        {/* Disabled overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-red-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-0.5 bg-red-500 transform rotate-45"></div>
            </div>
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
          {renderWeaponSlot(3, offhandWeapon, 'Offhand', isOffhandDisabled)}
        </div>
        <div className="text-xs text-gray-400 mt-1 text-center">Press 1-3</div>
        {isOffhandDisabled && (
          <div className="text-xs text-red-400 mt-1 text-center">Offhand disabled (2H weapon)</div>
        )}
      </div>
    </div>
  );
};
