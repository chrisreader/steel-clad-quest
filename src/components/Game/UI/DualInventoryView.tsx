import React, { useState } from 'react';
import { Item, WeaponSlots } from '../../../types/GameTypes';
import { ChestInventoryUI } from './ChestInventoryUI';
import { EquipmentPanel } from '../components/EquipmentPanel';
import { InventoryGrid } from '../components/InventoryGrid';
import { EquipmentStats } from '../components/EquipmentStats';
import { useInventoryManagement } from '../hooks/useInventoryManagement';
import { X } from 'lucide-react';

interface DualInventoryViewProps {
  isOpen: boolean;
  // Chest props
  chestItems: Item[];
  chestType: 'common' | 'rare';
  onCloseChest: () => void;
  onTakeItem: (item: Item, index: number) => void;
  onTakeAll: () => void;
  // Player inventory props
  playerItems: Item[];
  onUseItem: (item: Item) => void;
  onAddItemToInventory: (item: Item, targetSlot?: number) => void;
  onRemoveItemFromInventory: (index: number) => void;
  onMoveItemInInventory: (fromIndex: number, toIndex: number) => void;
  equippedWeapons: WeaponSlots;
  onEquippedWeaponsChange: (weapons: WeaponSlots) => void;
  onEquipWeapon?: (item: Item) => void;
  onUnequipWeapon?: () => void;
}

export const DualInventoryView: React.FC<DualInventoryViewProps> = ({
  isOpen,
  chestItems,
  chestType,
  onCloseChest,
  onTakeItem,
  onTakeAll,
  playerItems,
  onUseItem,
  onAddItemToInventory,
  onRemoveItemFromInventory,
  onMoveItemInInventory,
  equippedWeapons,
  onEquippedWeaponsChange,
  onEquipWeapon,
  onUnequipWeapon
}) => {
  // State for drag and drop functionality
  const [selectedItem, setSelectedItem] = useState<{
    item: Item;
    slotId: number;
    source: 'inventory' | 'chest';
  } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{ 
    item: Item; 
    source: 'inventory' | 'chest'; 
    sourceId: number;
  } | null>(null);

  if (!isOpen) return null;

  // Handle chest item drag start
  const handleChestDragStart = (event: React.DragEvent, item: Item, index: number) => {
    setDraggedItem({ item, source: 'chest', sourceId: index });
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle inventory item interactions
  const handleItemClick = (item: Item, slotId: number) => {
    if (selectedItem) {
      if (selectedItem.slotId === slotId && selectedItem.source === 'inventory') {
        setSelectedItem(null);
      } else {
        // Move item to this slot
        if (selectedItem.source === 'inventory') {
          onMoveItemInInventory(selectedItem.slotId, slotId);
        }
        setSelectedItem(null);
      }
    } else {
      setSelectedItem({
        item,
        slotId,
        source: 'inventory'
      });
    }
  };

  const handleSlotClick = (slotId: number) => {
    if (selectedItem) {
      if (selectedItem.source === 'inventory') {
        onMoveItemInInventory(selectedItem.slotId, slotId);
      } else if (selectedItem.source === 'chest') {
        // Move from chest to specific inventory slot
        onAddItemToInventory(selectedItem.item, slotId);
        onTakeItem(selectedItem.item, selectedItem.slotId);
      }
      setSelectedItem(null);
    }
  };

  const handleInventoryDragStart = (event: React.DragEvent, item: Item, slotId: number) => {
    setDraggedItem({ item, source: 'inventory', sourceId: slotId });
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle dropping items from chest to inventory
  const handleInventoryDrop = (event: React.DragEvent, targetSlotId: number) => {
    event.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.source === 'chest') {
      // Move from chest to specific inventory slot
      onAddItemToInventory(draggedItem.item, targetSlotId);
      onTakeItem(draggedItem.item, draggedItem.sourceId);
    } else if (draggedItem.source === 'inventory') {
      // Handle inventory to inventory moves
      onMoveItemInInventory(draggedItem.sourceId, targetSlotId);
    }

    setDraggedItem(null);
  };

  // Create inventory slots from playerItems
  const inventorySlots = Array.from({ length: 9 }, (_, index) => ({
    id: index,
    item: playerItems[index] || null,
    isEmpty: !playerItems[index]
  }));

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="flex gap-4 max-w-7xl w-full mx-4 h-[85vh]">
        {/* Chest Inventory - Left Side */}
        <div className="w-80 flex-shrink-0">
          <ChestInventoryUI
            isOpen={true}
            chestItems={chestItems}
            chestType={chestType}
            onClose={onCloseChest}
            onTakeItem={onTakeItem}
            onTakeAll={onTakeAll}
            onDragStart={handleChestDragStart}
          />
        </div>

        {/* Player Inventory - Right Side */}
        <div className="flex-1 max-w-4xl">
          <div className="bg-gray-900 rounded-lg p-6 text-white border-2 border-gray-700 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Player Inventory</h2>
              <button
                onClick={onCloseChest}
                className="text-gray-400 hover:text-white text-xl"
              >
                <X size={20} />
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
            
            <div className="flex gap-8 h-full overflow-hidden">
              {/* Equipment Panel */}
              <EquipmentPanel
                equippedWeapons={equippedWeapons}
                onUnequip={(slotType) => {
                  // Handle unequipping logic here
                }}
                onDrop={(event, targetSlotType) => {
                  // Handle equipment drops here
                }}
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
      </div>
    </div>
  );
};