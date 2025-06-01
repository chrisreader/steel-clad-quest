
import React from 'react';
import { Item, EquipmentSlotType, WeaponSlots } from '../../../types/GameTypes';
import { EquipmentSlot } from '../UI/EquipmentSlot';

interface EquipmentPanelProps {
  equippedWeapons: WeaponSlots;
  onUnequip: (slotType: EquipmentSlotType) => void;
  onDrop: (event: React.DragEvent, targetSlotType: EquipmentSlotType) => void;
}

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  equippedWeapons,
  onUnequip,
  onDrop
}) => {
  const equippedItems = {
    helmet: null,
    chestplate: null,
    leggings: null,
    boots: null,
    primary: equippedWeapons.primary,
    secondary: equippedWeapons.secondary,
    offhand: equippedWeapons.offhand,
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-4 text-center">Equipment</h3>
      
      {/* Helmet */}
      <EquipmentSlot
        slotType="helmet"
        item={equippedItems.helmet}
        onUnequip={onUnequip}
        onDrop={onDrop}
      />
      
      {/* Chestplate */}
      <EquipmentSlot
        slotType="chestplate"
        item={equippedItems.chestplate}
        onUnequip={onUnequip}
        onDrop={onDrop}
      />
      
      {/* Leggings */}
      <EquipmentSlot
        slotType="leggings"
        item={equippedItems.leggings}
        onUnequip={onUnequip}
        onDrop={onDrop}
      />
      
      {/* Boots */}
      <EquipmentSlot
        slotType="boots"
        item={equippedItems.boots}
        onUnequip={onUnequip}
        onDrop={onDrop}
      />
      
      {/* Weapon Slots */}
      <div className="mt-4 space-y-2">
        <div className="text-sm text-gray-400 text-center">Weapons</div>
        
        {/* Primary and Secondary side by side */}
        <div className="flex gap-4">
          <EquipmentSlot
            slotType="primary"
            item={equippedItems.primary}
            onUnequip={onUnequip}
            onDrop={onDrop}
          />
          <EquipmentSlot
            slotType="secondary"
            item={equippedItems.secondary}
            onUnequip={onUnequip}
            onDrop={onDrop}
          />
        </div>
        
        {/* Offhand below */}
        <div className="flex justify-center">
          <EquipmentSlot
            slotType="offhand"
            item={equippedItems.offhand}
            onUnequip={onUnequip}
            onDrop={onDrop}
          />
        </div>
      </div>
    </div>
  );
};
