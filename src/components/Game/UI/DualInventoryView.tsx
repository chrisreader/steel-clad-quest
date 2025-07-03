import React from 'react';
import { Item, WeaponSlots } from '../../../types/GameTypes';
import { ChestInventoryUI } from './ChestInventoryUI';
import { InventorySystem } from '../systems/InventorySystem';

interface DualInventoryViewProps {
  isOpen: boolean;
  // Chest props
  chestItems: Item[];
  chestType: 'common' | 'rare';
  onCloseChest: () => void;
  onTakeItem: (item: Item, index: number) => void;
  onTakeAll: () => void;
  // Player inventory props
  playerItems: Item[];
  onUseItem: (item: Item) => void;
  equippedWeapons: WeaponSlots;
  onEquippedWeaponsChange: (weapons: WeaponSlots) => void;
  onEquipWeapon?: (item: Item) => void;
  onUnequipWeapon?: () => void;
}

export const DualInventoryView: React.FC<DualInventoryViewProps> = ({
  isOpen,
  chestItems,
  chestType,
  onCloseChest,
  onTakeItem,
  onTakeAll,
  playerItems,
  onUseItem,
  equippedWeapons,
  onEquippedWeaponsChange,
  onEquipWeapon,
  onUnequipWeapon
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="flex gap-6 max-w-7xl w-full mx-4">
        {/* Chest Inventory */}
        <div className="flex-shrink-0">
          <ChestInventoryUI
            isOpen={true}
            chestItems={chestItems}
            chestType={chestType}
            onClose={onCloseChest}
            onTakeItem={onTakeItem}
            onTakeAll={onTakeAll}
          />
        </div>

        {/* Player Inventory */}
        <div className="flex-1">
          <InventorySystem
            items={playerItems}
            isOpen={true}
            onClose={onCloseChest}
            onUseItem={onUseItem}
            equippedWeapons={equippedWeapons}
            onEquippedWeaponsChange={onEquippedWeaponsChange}
            onEquipWeapon={onEquipWeapon}
            onUnequipWeapon={onUnequipWeapon}
          />
        </div>
      </div>
    </div>
  );
};