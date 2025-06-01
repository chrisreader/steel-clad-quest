
import { useState, useCallback } from 'react';
import { Item } from '../../../types/GameTypes';

export interface WeaponSlots {
  mainhand: Item | null;
  offhand: Item | null;
}

export const useWeaponManagement = (initialWeapons: WeaponSlots = { mainhand: null, offhand: null }) => {
  const [equippedWeapons, setEquippedWeapons] = useState<WeaponSlots>(initialWeapons);
  const [activeWeaponSlot, setActiveWeaponSlot] = useState<1 | 2>(1);

  const handleEquipWeapon = useCallback((item: Item) => {
    console.log('[useWeaponManagement] Equipping weapon:', item.name);
    
    setEquippedWeapons(prev => ({
      ...prev,
      [item.equipmentSlot]: item
    }));
    
    // Set the active slot to the newly equipped weapon's slot
    const targetSlot = item.equipmentSlot === 'offhand' ? 2 : 1;
    setActiveWeaponSlot(targetSlot);
    
    console.log(`Successfully equipped ${item.name} in ${item.equipmentSlot} slot`);
  }, []);

  const handleUnequipWeapon = useCallback(() => {
    console.log('[useWeaponManagement] Unequipping weapon from active slot');
    
    if (activeWeaponSlot === 1) {
      setEquippedWeapons(prev => ({ ...prev, mainhand: null }));
    } else {
      setEquippedWeapons(prev => ({ ...prev, offhand: null }));
    }
    
    console.log(`Weapon unequipped from slot ${activeWeaponSlot}`);
  }, [activeWeaponSlot]);

  const handleWeaponSlotSelect = useCallback((slot: 1 | 2) => {
    console.log(`[useWeaponManagement] Switching to weapon slot ${slot}`);
    setActiveWeaponSlot(slot);
  }, []);

  const getActiveWeapon = useCallback(() => {
    return activeWeaponSlot === 1 ? equippedWeapons.mainhand : equippedWeapons.offhand;
  }, [activeWeaponSlot, equippedWeapons]);

  return {
    equippedWeapons,
    setEquippedWeapons,
    activeWeaponSlot,
    handleEquipWeapon,
    handleUnequipWeapon,
    handleWeaponSlotSelect,
    getActiveWeapon
  };
};
