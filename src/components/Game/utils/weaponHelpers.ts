
import { Item, EquipmentSlotType } from '../../../types/GameTypes';

export const canEquipInSlot = (item: Item, slotType: EquipmentSlotType): boolean => {
  if (item.type !== 'weapon' && item.type !== 'armor') return false;
  
  // Weapon-specific restrictions for 3-slot system
  if (item.type === 'weapon') {
    // Swords can go in primary or secondary slots
    if (item.subtype === 'sword' && (slotType === 'primary' || slotType === 'secondary')) {
      return true;
    }
    // Bows can go in primary or secondary slots
    if (item.subtype === 'bow' && (slotType === 'primary' || slotType === 'secondary')) {
      return true;
    }
    // Shields can only go in off hand
    if (item.subtype === 'shield' && slotType === 'offhand') {
      return true;
    }
    // General weapon slots check - no weapons in armor slots
    if (slotType === 'helmet' || slotType === 'chestplate' || slotType === 'leggings' || slotType === 'boots') {
      return false;
    }
  }
  
  // Armor-specific restrictions
  if (item.type === 'armor') {
    return item.equipmentSlot === slotType;
  }
  
  return item.equipmentSlot === slotType;
};

export const getWeaponStats = (weapons: { primary: Item | null; secondary: Item | null; offhand: Item | null }) => {
  const primaryAttack = weapons.primary?.stats?.attack || 0;
  const secondaryAttack = weapons.secondary?.stats?.attack || 0;
  
  return {
    attack: Math.max(primaryAttack, secondaryAttack), // Use the higher attack value
    defense: 0 // Weapons don't provide defense in this system (shields would go here in the future)
  };
};

export const isWeaponTwoHanded = (item: Item | null): boolean => {
  if (!item || item.type !== 'weapon') return false;
  
  // For now, only bows are two-handed
  // In the future, we could check a handRequirement property on the item
  return item.subtype === 'bow';
};
