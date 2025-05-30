
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { InventorySystem } from '../systems/InventorySystem';

interface InventoryUIProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (item: Item) => void;
  onEquipWeapon?: (item: Item) => void;
  onUnequipWeapon?: () => void;
  equippedWeapons?: {
    mainhand: Item | null;
    offhand: Item | null;
  };
  onEquippedWeaponsChange?: (weapons: { mainhand: Item | null; offhand: Item | null; }) => void;
}

export const InventoryUI: React.FC<InventoryUIProps> = (props) => {
  // Simply pass through all props to the new InventorySystem
  return <InventorySystem {...props} equippedWeapons={props.equippedWeapons || { mainhand: null, offhand: null }} onEquippedWeaponsChange={props.onEquippedWeaponsChange || (() => {})} />;
};
