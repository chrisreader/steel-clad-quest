
import { useState, useCallback } from 'react';
import { Item, WeaponSlots } from '../../../types/GameTypes';

export type { WeaponSlots } from '../../../types/GameTypes';

export const useWeaponManagement = (initialWeapons: WeaponSlots = { primary: null, secondary: null, offhand: null }) => {
  const [equippedWeapons, setEquippedWeapons] = useState<WeaponSlots>(initialWeapons);
  const [activeWeaponSlot, setActiveWeaponSlot] = useState<1 | 2 | 3>(1);

  const handleEquipWeapon = useCallback((item: Item) => {
    console.log('[useWeaponManagement] 🏹 EQUIPPING WEAPON:', item.name, 'Type:', item.subtype);
    
    // Determine which slot to equip to based on item's equipmentSlot
    let targetSlot: keyof WeaponSlots = 'primary';
    if (item.equipmentSlot === 'secondary') {
      targetSlot = 'secondary';
    } else if (item.equipmentSlot === 'offhand') {
      targetSlot = 'offhand';
    } else if (item.equipmentSlot === 'primary') {
      targetSlot = 'primary';
    }
    
    console.log(`[useWeaponManagement] 🎯 TARGETING SLOT: ${targetSlot}`);
    
    setEquippedWeapons(prev => {
      const newWeapons = {
        ...prev,
        [targetSlot]: item
      };
      console.log(`[useWeaponManagement] 🔄 NEW WEAPONS STATE:`, newWeapons);
      return newWeapons;
    });
    
    // Set the active slot to the newly equipped weapon's slot
    const newActiveSlot = targetSlot === 'secondary' ? 2 : targetSlot === 'offhand' ? 3 : 1;
    console.log(`[useWeaponManagement] 🎯 SWITCHING TO SLOT: ${newActiveSlot}`);
    setActiveWeaponSlot(newActiveSlot);
    
    console.log(`[useWeaponManagement] ✅ EQUIPPED ${item.name} in ${targetSlot} slot (slot ${newActiveSlot})`);
  }, []);

  const handleUnequipWeapon = useCallback(() => {
    console.log('[useWeaponManagement] 🔄 UNEQUIPPING weapon from active slot:', activeWeaponSlot);
    
    const slotToUnequip = activeWeaponSlot === 1 ? 'primary' : activeWeaponSlot === 2 ? 'secondary' : 'offhand';
    const weaponBeingUnequipped = equippedWeapons[slotToUnequip];
    
    console.log(`[useWeaponManagement] 🗑️ UNEQUIPPING: ${weaponBeingUnequipped?.name || 'No weapon'} from ${slotToUnequip}`);
    
    setEquippedWeapons(prev => ({
      ...prev,
      [slotToUnequip]: null
    }));
    
    console.log(`[useWeaponManagement] ✅ UNEQUIPPED weapon from slot ${activeWeaponSlot} (${slotToUnequip})`);
  }, [activeWeaponSlot, equippedWeapons]);

  const handleWeaponSlotSelect = useCallback((slot: 1 | 2 | 3) => {
    console.log(`[useWeaponManagement] 🎯 SLOT SELECTION REQUEST: ${slot}`);
    console.log(`[useWeaponManagement] 🔍 CURRENT WEAPONS:`, equippedWeapons);
    
    // Check if trying to select offhand slot when two-handed weapon is equipped
    if (slot === 3) {
      const primaryWeapon = equippedWeapons.primary;
      const secondaryWeapon = equippedWeapons.secondary;
      
      // If primary slot has two-handed weapon and is active, prevent offhand selection
      if (primaryWeapon && primaryWeapon.weaponId) {
        // Note: We'll need to check hand requirement from weapon system
        // For now, assume bows are two-handed based on weaponId
        if (primaryWeapon.weaponId.includes('bow') && activeWeaponSlot === 1) {
          console.log('[useWeaponManagement] ❌ Cannot select offhand - two-handed weapon equipped in primary slot');
          return;
        }
      }
      
      // Same check for secondary slot
      if (secondaryWeapon && secondaryWeapon.weaponId) {
        if (secondaryWeapon.weaponId.includes('bow') && activeWeaponSlot === 2) {
          console.log('[useWeaponManagement] ❌ Cannot select offhand - two-handed weapon equipped in secondary slot');
          return;
        }
      }
    }
    
    // Get the weapon that will become active
    const targetWeapon = slot === 1 ? equippedWeapons.primary : 
                        slot === 2 ? equippedWeapons.secondary : 
                        equippedWeapons.offhand;
    
    console.log(`[useWeaponManagement] 🎯 SWITCHING TO SLOT ${slot} - Weapon: ${targetWeapon?.name || 'Empty'}`);
    
    setActiveWeaponSlot(slot);
    
    if (targetWeapon) {
      console.log(`[useWeaponManagement] ✅ ACTIVE WEAPON NOW: ${targetWeapon.name} (${targetWeapon.subtype})`);
      if (targetWeapon.subtype === 'bow') {
        console.log(`[useWeaponManagement] 🏹 BOW SELECTED - Player should be able to shoot arrows`);
      }
    } else {
      console.log(`[useWeaponManagement] 🔄 EMPTY SLOT SELECTED - No weapon active`);
    }
  }, [activeWeaponSlot, equippedWeapons]);

  const getActiveWeapon = useCallback(() => {
    const activeWeapon = activeWeaponSlot === 1 ? equippedWeapons.primary : 
                        activeWeaponSlot === 2 ? equippedWeapons.secondary : 
                        equippedWeapons.offhand;
    
    // Removed high-frequency log for performance
    
    return activeWeapon;
  }, [activeWeaponSlot, equippedWeapons]);

  const isOffhandDisabled = useCallback(() => {
    const activeWeapon = getActiveWeapon();
    // Check if current active weapon is two-handed
    if (activeWeapon && activeWeapon.weaponId) {
      // Simple check - bows are two-handed
      const isDisabled = activeWeapon.weaponId.includes('bow');
      if (isDisabled) {
        console.log(`[useWeaponManagement] 🔒 OFFHAND DISABLED - Two-handed weapon (${activeWeapon.name}) is active`);
      }
      return isDisabled;
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
