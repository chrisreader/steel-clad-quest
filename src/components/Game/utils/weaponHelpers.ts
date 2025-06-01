
import { Item, EquipmentSlotType } from '../../../types/GameTypes';

export const canEquipInSlot = (item: Item, slotType: EquipmentSlotType): boolean => {
  if (item.type !== 'weapon' && item.type !== 'armor') return false;
  
  // Weapon-specific restrictions for new 3-slot system
  if (item.type === 'weapon') {
    // Swords can go in primary or secondary
    if (item.subtype === 'sword' && (slotType === 'primary' || slotType === 'secondary')) {
      return true;
    }
    // Bows can go in primary or secondary
    if (item.subtype === 'bow' && (slotType === 'primary' || slotType === 'secondary')) {
      return true;
    }
    // Shields can only go in offhand
    if (item.subtype === 'shield' && slotType === 'offhand') {
      return true;
    }
    // General weapon slots check (no weapons in armor slots)
    if (['helmet', 'chestplate', 'leggings', 'boots'].includes(slotType)) {
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
  const activeWeaponAttack = weapons.primary?.stats?.attack || weapons.secondary?.stats?.attack || 0;
  const offhandDefense = weapons.offhand?.stats?.defense || 0;
  
  return {
    attack: activeWeaponAttack,
    defense: offhandDefense
  };
};
