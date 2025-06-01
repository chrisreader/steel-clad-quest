
import { useState, useCallback } from 'react';
import { Item } from '../../../types/GameTypes';

export interface WeaponSlots {
  primary: Item | null;
  secondary: Item | null;
  offhand: Item | null;
}

export const useWeaponManagement = (initialWeapons: WeaponSlots = { primary: null, secondary: null, offhand: null }) => {
  const [equippedWeapons, setEquippedWeapons] = useState<WeaponSlots>(initialWeapons);
  const [activeWeaponSlot, setActiveWeaponSlot] = useState<1 | 2 | 3>(1);

  // Check if offhand should be disabled based on active weapon
  const isOffhandDisabled = useCallback(() => {
    const activeWeapon = activeWeaponSlot === 1 ? equippedWeapons.primary : equippedWeapons.secondary;
    if (!activeWeapon || !activeWeapon.weaponId) return false;
    
    // Check if the weapon has handRequirement metadata (we'll need to add this to items)
    // For now, assume bows are two-handed
    return activeWeapon.subtype === 'bow';
  }, [activeWeaponSlot, equippedWeapons]);

  const handleEquipWeapon = useCallback((item: Item) => {
    console.log('[useWeaponManagement] Equipping weapon:', item.name);
    
    // Determine which slot to equip to based on item properties
    let targetSlot: keyof WeaponSlots;
    
    if (item.equipmentSlot === 'offhand') {
      targetSlot = 'offhand';
    } else if (item.equipmentSlot === 'secondary') {
      targetSlot = 'secondary';
    } else {
      targetSlot = 'primary';
    }
    
    setEquippedWeapons(prev => {
      const newWeapons = { ...prev, [targetSlot]: item };
      
      // If equipping a two-handed weapon, clear offhand
      if (item.subtype === 'bow' && (targetSlot === 'primary' || targetSlot === 'secondary')) {
        newWeapons.offhand = null;
        console.log('[useWeaponManagement] Cleared offhand due to two-handed weapon');
      }
      
      return newWeapons;
    });
    
    // Set the active slot to the newly equipped weapon's slot
    const newActiveSlot = targetSlot === 'offhand' ? 3 : (targetSlot === 'secondary' ? 2 : 1);
    setActiveWeaponSlot(newActiveSlot as 1 | 2 | 3);
    
    console.log(`Successfully equipped ${item.name} in ${targetSlot} slot`);
  }, []);

  const handleUnequipWeapon = useCallback(() => {
    console.log('[useWeaponManagement] Unequipping weapon from active slot');
    
    const slotMap = { 1: 'primary', 2: 'secondary', 3: 'offhand' } as const;
    const targetSlot = slotMap[activeWeaponSlot];
    
    setEquippedWeapons(prev => ({ ...prev, [targetSlot]: null }));
    
    console.log(`Weapon unequipped from slot ${activeWeaponSlot} (${targetSlot})`);
  }, [activeWeaponSlot]);

  const handleWeaponSlotSelect = useCallback((slot: 1 | 2 | 3) => {
    // Prevent switching to offhand if it's disabled by two-handed weapon
    if (slot === 3 && isOffhandDisabled()) {
      console.log('[useWeaponManagement] Cannot switch to offhand - disabled by two-handed weapon');
      return;
    }
    
    console.log(`[useWeaponManagement] Switching to weapon slot ${slot}`);
    setActiveWeaponSlot(slot);
  }, [isOffhandDisabled]);

  const getActiveWeapon = useCallback(() => {
    switch (activeWeaponSlot) {
      case 1: return equippedWeapons.primary;
      case 2: return equippedWeapons.secondary;
      case 3: return equippedWeapons.offhand;
      default: return null;
    }
  }, [activeWeaponSlot, equippedWeapons]);

  return {
    equippedWeapons,
    setEquippedWeapons,
    activeWeaponSlot,
    isOffhandDisabled: isOffhandDisabled(),
    handleEquipWeapon,
    handleUnequipWeapon,
    handleWeaponSlotSelect,
    getActiveWeapon
  };
};
