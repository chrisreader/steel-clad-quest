
import React from 'react';
import { Item, EquipmentSlotType } from '../../../types/GameTypes';
import { EquipmentSlot } from '../UI/EquipmentSlot';

interface EquipmentPanelProps {
  equippedWeapons: {
    mainhand: Item | null;
    offhand: Item | null;
  };
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
    mainhand: equippedWeapons.mainhand,
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
      <div className="flex gap-4 mt-4">
        <EquipmentSlot
          slotType="mainhand"
          item={equippedItems.mainhand}
          onUnequip={onUnequip}
          onDrop={onDrop}
        />
        <EquipmentSlot
          slotType="offhand"
          item={equippedItems.offhand}
          onUnequip={onUnequip}
          onDrop={onDrop}
        />
      </div>
    </div>
  );
};
