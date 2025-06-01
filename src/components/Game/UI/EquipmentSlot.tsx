
import React from 'react';
import { Item, EquipmentSlotType } from '../../../types/GameTypes';
import { Sword, Shield, Target } from 'lucide-react';

interface EquipmentSlotProps {
  slotType: EquipmentSlotType;
  item: Item | null;
  onEquip?: (item: Item) => void;
  onUnequip?: (slotType: EquipmentSlotType) => void;
  onDrop?: (event: React.DragEvent, slotType: EquipmentSlotType) => void;
  onDragOver?: (event: React.DragEvent) => void;
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
  slotType,
  item,
  onEquip,
  onUnequip,
  onDrop,
  onDragOver
}) => {
  const getSlotLabel = (type: EquipmentSlotType): string => {
    switch (type) {
      case 'helmet': return 'Helmet';
      case 'chestplate': return 'Chest';
      case 'leggings': return 'Legs';
      case 'boots': return 'Feet';
      case 'primary': return 'Primary';
      case 'secondary': return 'Secondary';
      case 'offhand': return 'Offhand';
      default: return type;
    }
  };

  const getSlotIcon = (type: EquipmentSlotType) => {
    if (item) {
      // Show specific weapon icons based on weapon type
      if (item.subtype === 'sword') {
        return <Sword className="w-6 h-6 text-yellow-400" />;
      }
      if (item.subtype === 'bow') {
        return <Target className="w-6 h-6 text-green-400" />;
      }
      if (item.subtype === 'shield') {
        return <Shield className="w-6 h-6 text-gray-400" />;
      }
      // For other equipped items, show first letter
      return (
        <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-xs font-bold text-white">
          {item.name.charAt(0).toUpperCase()}
        </div>
      );
    }
    
    // Default empty slot placeholders
    switch (type) {
      case 'helmet':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-600" />;
      case 'chestplate':
        return <div className="w-6 h-6 border-2 border-gray-600 rounded-sm" />;
      case 'leggings':
        return <div className="w-4 h-6 border-2 border-gray-600 rounded-sm" />;
      case 'boots':
        return <div className="w-5 h-4 border-2 border-gray-600 rounded-sm" />;
      case 'primary':
      case 'secondary':
        return <div className="w-6 h-6 border-2 border-gray-600 rounded-sm transform rotate-45" />;
      case 'offhand':
        return <div className="w-6 h-6 border-2 border-gray-600 rounded-full" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (item && onUnequip) {
      onUnequip(slotType);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (onDrop) {
      onDrop(event, slotType);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (onDragOver) {
      onDragOver(event);
    }
  };

  return (
    <div className="flex flex-col items-center mb-2">
      <div className="text-xs text-gray-400 mb-1">{getSlotLabel(slotType)}</div>
      <div
        className={`
          w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer
          transition-colors duration-200
          ${item 
            ? 'border-yellow-500 bg-gray-700 hover:bg-gray-600' 
            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }
        `}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        title={item ? `${item.name}\n${item.description}` : `Empty ${getSlotLabel(slotType)} slot`}
      >
        {item ? (
          <div className="flex flex-col items-center">
            {getSlotIcon(slotType)}
            {item.quantity > 1 && (
              <span className="text-xs text-green-400 absolute -mt-2 -mr-2">
                {item.quantity}
              </span>
            )}
          </div>
        ) : (
          getSlotIcon(slotType)
        )}
      </div>
    </div>
  );
};
