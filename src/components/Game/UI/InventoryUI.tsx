import React, { useState, useEffect, useCallback } from 'react';
import { Item, EquippedItems, InventorySlot as IInventorySlot, EquipmentSlotType } from '../../../types/GameTypes';
import { EquipmentSlot } from './EquipmentSlot';
import { InventorySlot } from './InventorySlot';

interface InventoryUIProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (item: Item) => void;
  onEquipWeapon?: (item: Item) => void;
  onUnequipWeapon?: () => void;
}

export const InventoryUI: React.FC<InventoryUIProps> = ({
  items,
  isOpen,
  onClose,
  onUseItem,
  onEquipWeapon,
  onUnequipWeapon
}) => {
  // Initialize equipment slots - all empty by default
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    helmet: null,
    chestplate: null,
    leggings: null,
    boots: null,
    mainhand: null,
    offhand: null,
  });

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

  // Selection state for click-to-move functionality
  const [selectedItem, setSelectedItem] = useState<{
    item: Item;
    slotId: number;
    source: 'inventory' | 'equipment';
  } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ item: Item; source: 'inventory' | 'equipment'; sourceId: number | EquipmentSlotType } | null>(null);

  // Helper function to check if an item can be equipped in a specific slot
  const canEquipInSlot = (item: Item, slotType: EquipmentSlotType): boolean => {
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

  // Sync inventory slots with items prop
  useEffect(() => {
    console.log('InventoryUI: Syncing with items prop:', items);
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
      
      console.log('InventoryUI: Updated slots:', newSlots);
      return newSlots;
    });
  }, [items]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedItem(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleItemClick = (item: Item, slotId: number) => {
    if (selectedItem) {
      // If we have a selected item, try to move it to this slot
      if (selectedItem.slotId === slotId && selectedItem.source === 'inventory') {
        // Clicking the same item deselects it
        setSelectedItem(null);
      } else {
        // Move the selected item to this slot
        moveSelectedItemToSlot(slotId);
      }
    } else {
      // Select the item
      setSelectedItem({
        item,
        slotId,
        source: 'inventory'
      });
    }
  };

  const handleSlotClick = (slotId: number) => {
    if (selectedItem) {
      // Move selected item to this empty slot
      moveSelectedItemToSlot(slotId);
    }
  };

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

  const handleEquipmentDragStart = (event: React.DragEvent, item: Item, slotType: EquipmentSlotType) => {
    setDraggedItem({ item, source: 'equipment', sourceId: slotType });
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleInventoryDragStart = (event: React.DragEvent, item: Item, slotId: number) => {
    setDraggedItem({ item, source: 'inventory', sourceId: slotId });
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleEquipmentDrop = (event: React.DragEvent, targetSlotType: EquipmentSlotType) => {
    event.preventDefault();
    if (!draggedItem) return;

    // Check if item can be equipped in this slot with new restrictions
    const canEquip = canEquipInSlot(draggedItem.item, targetSlotType);
    if (!canEquip) {
      console.log(`Cannot equip ${draggedItem.item.name} in ${targetSlotType} slot`);
      setDraggedItem(null);
      return;
    }

    if (draggedItem.source === 'inventory') {
      const sourceSlotId = draggedItem.sourceId as number;
      const currentEquipped = equippedItems[targetSlotType];
      
      // Handle weapon equipping
      if (targetSlotType === 'mainhand' && draggedItem.item.weaponId && onEquipWeapon) {
        onEquipWeapon(draggedItem.item);
      }
      
      setEquippedItems(prev => ({
        ...prev,
        [targetSlotType]: draggedItem.item
      }));

      setInventorySlots(prev => prev.map(slot => 
        slot.id === sourceSlotId 
          ? { ...slot, item: currentEquipped, isEmpty: !currentEquipped }
          : slot
      ));
    } else if (draggedItem.source === 'equipment') {
      // Swap equipment slots - also check if the target item can go to source slot
      const sourceSlotType = draggedItem.sourceId as EquipmentSlotType;
      const targetItem = equippedItems[targetSlotType];
      
      // If there's a target item, check if it can go to the source slot
      if (targetItem && !canEquipInSlot(targetItem, sourceSlotType)) {
        console.log(`Cannot swap: ${targetItem.name} cannot go to ${sourceSlotType} slot`);
        setDraggedItem(null);
        return;
      }
      
      // Handle weapon swapping
      if (targetSlotType === 'mainhand' && draggedItem.item.weaponId && onEquipWeapon) {
        onEquipWeapon(draggedItem.item);
      }
      
      setEquippedItems(prev => ({
        ...prev,
        [targetSlotType]: draggedItem.item,
        [sourceSlotType]: targetItem
      }));
    }

    setDraggedItem(null);
  };

  const handleInventoryDrop = (event: React.DragEvent, targetSlotId: number) => {
    event.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.source === 'equipment') {
      // Move from equipment to inventory
      const sourceSlotType = draggedItem.sourceId as EquipmentSlotType;
      const targetSlot = inventorySlots[targetSlotId];
      
      setInventorySlots(prev => prev.map(slot =>
        slot.id === targetSlotId
          ? { ...slot, item: draggedItem.item, isEmpty: false }
          : slot
      ));

      setEquippedItems(prev => ({
        ...prev,
        [sourceSlotType]: targetSlot.item
      }));
    } else if (draggedItem.source === 'inventory') {
      // Swap inventory slots
      const sourceSlotId = draggedItem.sourceId as number;
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

    setDraggedItem(null);
  };

  const handleUnequip = (slotType: EquipmentSlotType) => {
    const item = equippedItems[slotType];
    if (!item) return;

    // Handle weapon unequipping
    if (slotType === 'mainhand' && item.weaponId && onUnequipWeapon) {
      onUnequipWeapon();
    }

    // Find empty inventory slot
    const emptySlotIndex = inventorySlots.findIndex(slot => slot.isEmpty);
    if (emptySlotIndex !== -1) {
      setInventorySlots(prev => prev.map(slot =>
        slot.id === emptySlotIndex
          ? { ...slot, item, isEmpty: false }
          : slot
      ));

      setEquippedItems(prev => ({
        ...prev,
        [slotType]: null
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-gray-900 rounded-lg p-6 text-white max-w-4xl w-full mx-4 border-2 border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
        
        {selectedItem && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-500">
            <p className="text-sm text-blue-300">
              <span className="font-semibold">{selectedItem.item.name}</span> selected. 
              Click another slot to move it there, or press ESC to cancel.
            </p>
          </div>
        )}
        
        <div className="flex gap-8">
          {/* Equipment Panel */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4 text-center">Equipment</h3>
            
            {/* Helmet */}
            <EquipmentSlot
              slotType="helmet"
              item={equippedItems.helmet}
              onUnequip={handleUnequip}
              onDrop={handleEquipmentDrop}
            />
            
            {/* Chestplate */}
            <EquipmentSlot
              slotType="chestplate"
              item={equippedItems.chestplate}
              onUnequip={handleUnequip}
              onDrop={handleEquipmentDrop}
            />
            
            {/* Leggings */}
            <EquipmentSlot
              slotType="leggings"
              item={equippedItems.leggings}
              onUnequip={handleUnequip}
              onDrop={handleEquipmentDrop}
            />
            
            {/* Boots */}
            <EquipmentSlot
              slotType="boots"
              item={equippedItems.boots}
              onUnequip={handleUnequip}
              onDrop={handleEquipmentDrop}
            />
            
            {/* Weapon Slots */}
            <div className="flex gap-4 mt-4">
              <EquipmentSlot
                slotType="mainhand"
                item={equippedItems.mainhand}
                onUnequip={handleUnequip}
                onDrop={handleEquipmentDrop}
              />
              <EquipmentSlot
                slotType="offhand"
                item={equippedItems.offhand}
                onUnequip={handleUnequip}
                onDrop={handleEquipmentDrop}
              />
            </div>
          </div>
          
          {/* Main Inventory Grid */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Inventory</h3>
            <div className="grid grid-cols-3 gap-2 max-w-48">
              {inventorySlots.map((slot) => (
                <InventorySlot
                  key={slot.id}
                  slotId={slot.id}
                  item={slot.item}
                  isSelected={selectedItem?.slotId === slot.id && selectedItem?.source === 'inventory'}
                  onItemClick={handleItemClick}
                  onSlotClick={handleSlotClick}
                  onDragStart={handleInventoryDragStart}
                  onDrop={handleInventoryDrop}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Equipment Stats Display */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Equipment Bonuses</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-400">Attack: </span>
              <span>+{equippedItems.mainhand?.stats?.attack || 0}</span>
            </div>
            <div>
              <span className="text-blue-400">Defense: </span>
              <span>+{(equippedItems.helmet?.stats?.defense || 0) + 
                      (equippedItems.chestplate?.stats?.defense || 0) + 
                      (equippedItems.leggings?.stats?.defense || 0) + 
                      (equippedItems.boots?.stats?.defense || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
