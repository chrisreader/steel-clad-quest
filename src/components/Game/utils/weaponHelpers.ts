
import { Item, EquipmentSlotType } from '../../../types/GameTypes';

export const canEquipInSlot = (item: Item, slotType: EquipmentSlotType): boolean => {
  if (item.type !== 'weapon' && item.type !== 'armor') return false;
  
  // Weapon-specific restrictions
  if (item.type === 'weapon') {
    // Swords can only go in main hand
    if (item.subtype === 'sword' && slotType !== 'mainhand') {
      return false;
    }
    // Shields can only go in off hand
    if (item.subtype === 'shield' && slotType !== 'offhand') {
      return false;
    }
    // General weapon slots check
    if (slotType !== 'mainhand' && slotType !== 'offhand') {
      return false;
    }
  }
  
  // Armor-specific restrictions
  if (item.type === 'armor') {
    return item.equipmentSlot === slotType;
  }
  
  return item.equipmentSlot === slotType;
};

export const getWeaponStats = (weapons: { mainhand: Item | null; offhand: Item | null }) => {
  return {
    attack: weapons.mainhand?.stats?.attack || 0,
    defense: 0 // Weapons don't provide defense in this system
  };
};
