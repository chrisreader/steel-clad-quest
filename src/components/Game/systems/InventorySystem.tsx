
import React, { useCallback, useEffect } from 'react';
import { Item, EquipmentSlotType } from '../../../types/GameTypes';
import { EquipmentPanel } from '../components/EquipmentPanel';
import { InventoryGrid } from '../components/InventoryGrid';
import { EquipmentStats } from '../components/EquipmentStats';
import { useInventoryManagement } from '../hooks/useInventoryManagement';
import { canEquipInSlot } from '../utils/weaponHelpers';

interface InventorySystemProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (item: Item) => void;
  equippedWeapons: {
    mainhand: Item | null;
    offhand: Item | null;
  };
  onEquippedWeaponsChange: (weapons: { mainhand: Item | null; offhand: Item | null; }) => void;
  onEquipWeapon?: (item: Item) => void;
  onUnequipWeapon?: () => void;
}

export const InventorySystem: React.FC<InventorySystemProps> = ({
  items,
  isOpen,
  onClose,
  onUseItem,
  equippedWeapons,
  onEquippedWeaponsChange,
  onEquipWeapon,
  onUnequipWeapon
}) => {
  const {
    inventorySlots,
    setInventorySlots,
    selectedItem,
    setSelectedItem,
    draggedItem,
    setDraggedItem,
    moveSelectedItemToSlot
  } = useInventoryManagement(items);

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
  }, [isOpen, setSelectedItem]);

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

  const handleInventoryDragStart = (event: React.DragEvent, item: Item, slotId: number) => {
    setDraggedItem({ item, source: 'inventory', sourceId: slotId });
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleEquipmentDrop = (event: React.DragEvent, targetSlotType: EquipmentSlotType) => {
    event.preventDefault();
    if (!draggedItem || !onEquippedWeaponsChange) return;

    // Check if item can be equipped in this slot with new restrictions
    const canEquip = canEquipInSlot(draggedItem.item, targetSlotType);
    if (!canEquip) {
      console.log(`Cannot equip ${draggedItem.item.name} in ${targetSlotType} slot`);
      setDraggedItem(null);
      return;
    }

    if (draggedItem.source === 'inventory') {
      const sourceSlotId = draggedItem.sourceId as number;
      const currentEquipped = targetSlotType === 'mainhand' ? equippedWeapons.mainhand : equippedWeapons.offhand;
      
      // Handle weapon equipping
      if (targetSlotType === 'mainhand' && draggedItem.item.weaponId && onEquipWeapon) {
        onEquipWeapon(draggedItem.item);
      }
      
      // Update equipped weapons through callback
      if (targetSlotType === 'mainhand' || targetSlotType === 'offhand') {
        onEquippedWeaponsChange({
          ...equippedWeapons,
          [targetSlotType]: draggedItem.item
        });
      }

      setInventorySlots(prev => prev.map(slot => 
        slot.id === sourceSlotId 
          ? { ...slot, item: currentEquipped, isEmpty: !currentEquipped }
          : slot
      ));
    }

    setDraggedItem(null);
  };

  const handleInventoryDrop = (event: React.DragEvent, targetSlotId: number) => {
    event.preventDefault();
    if (!draggedItem || !onEquippedWeaponsChange) return;

    if (draggedItem.source === 'equipment') {
      // Move from equipment to inventory
      const sourceSlotType = draggedItem.sourceId as EquipmentSlotType;
      const targetSlot = inventorySlots[targetSlotId];
      
      setInventorySlots(prev => prev.map(slot =>
        slot.id === targetSlotId
          ? { ...slot, item: draggedItem.item, isEmpty: false }
          : slot
      ));

      // Update equipped weapons through callback for weapon slots
      if (sourceSlotType === 'mainhand' || sourceSlotType === 'offhand') {
        onEquippedWeaponsChange({
          ...equippedWeapons,
          [sourceSlotType]: targetSlot.item
        });
      }
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
    const item = slotType === 'mainhand' ? equippedWeapons.mainhand : equippedWeapons.offhand;
    if (!item || !onEquippedWeaponsChange) return;

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

      // Update equipped weapons through callback for weapon slots
      if (slotType === 'mainhand' || slotType === 'offhand') {
        onEquippedWeaponsChange({
          ...equippedWeapons,
          [slotType]: null
        });
      }
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
          <EquipmentPanel
            equippedWeapons={equippedWeapons}
            onUnequip={handleUnequip}
            onDrop={handleEquipmentDrop}
          />
          
          {/* Main Inventory Grid */}
          <InventoryGrid
            inventorySlots={inventorySlots}
            selectedItem={selectedItem}
            onItemClick={handleItemClick}
            onSlotClick={handleSlotClick}
            onDragStart={handleInventoryDragStart}
            onDrop={handleInventoryDrop}
          />
        </div>
        
        {/* Equipment Stats Display */}
        <EquipmentStats equippedWeapons={equippedWeapons} />
      </div>
    </div>
  );
};
