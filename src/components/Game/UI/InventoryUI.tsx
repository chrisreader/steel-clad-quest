import React, { useState } from 'react';
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
  // Initialize equipment slots
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    helmet: null,
    chestplate: null,
    leggings: null,
    boots: null,
    mainhand: items.find(item => item.subtype === 'sword') || null, // Auto-equip sword
    offhand: null,
  });

  // Initialize 9 inventory slots
  const [inventorySlots, setInventorySlots] = useState<IInventorySlot[]>(() => {
    const slots: IInventorySlot[] = [];
    for (let i = 0; i < 9; i++) {
      const item = items[i] || null;
      slots.push({
        id: i,
        item: item && item.subtype !== 'sword' ? item : null, // Don't show sword in inventory if equipped
        isEmpty: !item || item.subtype === 'sword'
      });
    }
    return slots;
  });

  const [draggedItem, setDraggedItem] = useState<{ item: Item; source: 'inventory' | 'equipment'; sourceId: number | EquipmentSlotType } | null>(null);

  if (!isOpen) return null;

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

    // Check if item can be equipped in this slot
    const canEquip = draggedItem.item.equipmentSlot === targetSlotType;
    if (!canEquip) return;

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
      // Swap equipment slots
      const sourceSlotType = draggedItem.sourceId as EquipmentSlotType;
      const targetItem = equippedItems[targetSlotType];
      
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

  const handleItemClick = (item: Item, slotId: number) => {
    onUseItem(item);
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
                  onItemClick={handleItemClick}
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
