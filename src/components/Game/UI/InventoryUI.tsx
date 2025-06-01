
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { InventorySystem } from '../systems/InventorySystem';
import { WeaponSlots } from '../hooks/useWeaponManagement';

interface InventoryUIProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (item: Item) => void;
  onEquipWeapon?: (item: Item) => void;
  onUnequipWeapon?: () => void;
  equippedWeapons?: WeaponSlots;
  onEquippedWeaponsChange?: (weapons: WeaponSlots) => void;
}

export const InventoryUI: React.FC<InventoryUIProps> = (props) => {
  // Simply pass through all props to the new InventorySystem
  return <InventorySystem {...props} equippedWeapons={props.equippedWeapons || { primary: null, secondary: null, offhand: null }} onEquippedWeaponsChange={props.onEquippedWeaponsChange || (() => {})} />;
};
