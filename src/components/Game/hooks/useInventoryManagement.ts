
import { useState, useEffect, useCallback } from 'react';
import { Item, InventorySlot as IInventorySlot } from '../../../types/GameTypes';

export const useInventoryManagement = (items: Item[]) => {
  // Initialize 9 inventory slots
  const [inventorySlots, setInventorySlots] = useState<IInventorySlot[]>(() => {
    const slots: IInventorySlot[] = [];
    for (let i = 0; i < 9; i++) {
      slots.push({
        id: i,
        item: null,
        isEmpty: true
      });
    }
    return slots;
  });

  const [selectedItem, setSelectedItem] = useState<{
    item: Item;
    slotId: number;
    source: 'inventory' | 'equipment' | 'chest';
  } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ 
    item: Item; 
    source: 'inventory' | 'equipment' | 'chest'; 
    sourceId: number | string;
  } | null>(null);

  // Sync inventory slots with items prop
  useEffect(() => {
    console.log('useInventoryManagement: Syncing with items prop:', items);
    setInventorySlots(prevSlots => {
      const newSlots = [...prevSlots];
      
      // Clear all slots first
      newSlots.forEach(slot => {
        slot.item = null;
        slot.isEmpty = true;
      });
      
      // Fill slots with items from prop
      items.forEach((item, index) => {
        if (index < 9) { // Only fill up to 9 slots
          newSlots[index] = {
            id: index,
            item: item,
            isEmpty: false
          };
        }
      });
      
      console.log('useInventoryManagement: Updated slots:', newSlots);
      return newSlots;
    });
  }, [items]);

  const moveSelectedItemToSlot = useCallback((targetSlotId: number) => {
    if (!selectedItem) return;

    if (selectedItem.source === 'inventory') {
      // Moving within inventory
      const sourceSlotId = selectedItem.slotId;
      const sourceSlot = inventorySlots[sourceSlotId];
      const targetSlot = inventorySlots[targetSlotId];
      
      setInventorySlots(prev => prev.map(slot => {
        if (slot.id === sourceSlotId) {
          return { ...slot, item: targetSlot.item, isEmpty: !targetSlot.item };
        } else if (slot.id === targetSlotId) {
          return { ...slot, item: sourceSlot.item, isEmpty: !sourceSlot.item };
        }
        return slot;
      }));
    }

    setSelectedItem(null);
  }, [selectedItem, inventorySlots]);

  return {
    inventorySlots,
    setInventorySlots,
    selectedItem,
    setSelectedItem,
    draggedItem,
    setDraggedItem,
    moveSelectedItemToSlot
  };
};
