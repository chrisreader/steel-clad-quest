
import { useState, useCallback } from 'react';
import { Item, WeaponSlots } from '../../../types/GameTypes';

export { WeaponSlots } from '../../../types/GameTypes';

export const useWeaponManagement = (initialWeapons: WeaponSlots = { primary: null, secondary: null, offhand: null }) => {
  const [equippedWeapons, setEquippedWeapons] = useState<WeaponSlots>(initialWeapons);
  const [activeWeaponSlot, setActiveWeaponSlot] = useState<1 | 2 | 3>(1);

  const handleEquipWeapon = useCallback((item: Item) => {
    console.log('[useWeaponManagement] Equipping weapon:', item.name);
    
    // Determine which slot to equip to based on item's equipmentSlot
    let targetSlot: keyof WeaponSlots = 'primary';
    if (item.equipmentSlot === 'secondary') {
      targetSlot = 'secondary';
    } else if (item.equipmentSlot === 'offhand') {
      targetSlot = 'offhand';
    } else if (item.equipmentSlot === 'primary') {
      targetSlot = 'primary';
    }
    
    setEquippedWeapons(prev => ({
      ...prev,
      [targetSlot]: item
    }));
    
    // Set the active slot to the newly equipped weapon's slot
    const newActiveSlot = targetSlot === 'secondary' ? 2 : targetSlot === 'offhand' ? 3 : 1;
    setActiveWeaponSlot(newActiveSlot);
    
    console.log(`Successfully equipped ${item.name} in ${targetSlot} slot`);
  }, []);

  const handleUnequipWeapon = useCallback(() => {
    console.log('[useWeaponManagement] Unequipping weapon from active slot');
    
    const slotToUnequip = activeWeaponSlot === 1 ? 'primary' : activeWeaponSlot === 2 ? 'secondary' : 'offhand';
    
    setEquippedWeapons(prev => ({
      ...prev,
      [slotToUnequip]: null
    }));
    
    console.log(`Weapon unequipped from slot ${activeWeaponSlot} (${slotToUnequip})`);
  }, [activeWeaponSlot]);

  const handleWeaponSlotSelect = useCallback((slot: 1 | 2 | 3) => {
    console.log(`[useWeaponManagement] Switching to weapon slot ${slot}`);
    
    // Check if trying to select offhand slot when two-handed weapon is equipped
    if (slot === 3) {
      const primaryWeapon = equippedWeapons.primary;
      const secondaryWeapon = equippedWeapons.secondary;
      
      // If primary slot has two-handed weapon and is active, prevent offhand selection
      if (primaryWeapon && primaryWeapon.weaponId) {
        // Note: We'll need to check hand requirement from weapon system
        // For now, assume bows are two-handed based on weaponId
        if (primaryWeapon.weaponId.includes('bow') && activeWeaponSlot === 1) {
          console.log('Cannot select offhand - two-handed weapon equipped in primary slot');
          return;
        }
      }
      
      // Same check for secondary slot
      if (secondaryWeapon && secondaryWeapon.weaponId) {
        if (secondaryWeapon.weaponId.includes('bow') && activeWeaponSlot === 2) {
          console.log('Cannot select offhand - two-handed weapon equipped in secondary slot');
          return;
        }
      }
    }
    
    setActiveWeaponSlot(slot);
  }, [activeWeaponSlot, equippedWeapons]);

  const getActiveWeapon = useCallback(() => {
    if (activeWeaponSlot === 1) return equippedWeapons.primary;
    if (activeWeaponSlot === 2) return equippedWeapons.secondary;
    return equippedWeapons.offhand;
  }, [activeWeaponSlot, equippedWeapons]);

  const isOffhandDisabled = useCallback(() => {
    const activeWeapon = getActiveWeapon();
    // Check if current active weapon is two-handed
    if (activeWeapon && activeWeapon.weaponId) {
      // Simple check - bows are two-handed
      return activeWeapon.weaponId.includes('bow');
    }
    return false;
  }, [getActiveWeapon]);

  return {
    equippedWeapons,
    setEquippedWeapons,
    activeWeaponSlot,
    handleEquipWeapon,
    handleUnequipWeapon,
    handleWeaponSlotSelect,
    getActiveWeapon,
    isOffhandDisabled
  };
};
