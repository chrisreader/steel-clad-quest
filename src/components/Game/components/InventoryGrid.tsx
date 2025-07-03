
import React from 'react';
import { Item, InventorySlot as IInventorySlot } from '../../../types/GameTypes';
import { InventorySlot } from '../UI/InventorySlot';

interface InventoryGridProps {
  inventorySlots: IInventorySlot[];
  selectedItem: {
    item: Item;
    slotId: number;
    source: 'inventory' | 'equipment' | 'chest';
  } | null;
  onItemClick: (item: Item, slotId: number) => void;
  onSlotClick: (slotId: number) => void;
  onDragStart: (event: React.DragEvent, item: Item, slotId: number) => void;
  onDrop: (event: React.DragEvent, targetSlotId: number) => void;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  inventorySlots,
  selectedItem,
  onItemClick,
  onSlotClick,
  onDragStart,
  onDrop
}) => {
  return (
    <div className="flex-1">
      <h3 className="text-lg font-semibold mb-4">Inventory</h3>
      <div className="grid grid-cols-3 gap-2 max-w-48">
        {inventorySlots.map((slot) => (
          <InventorySlot
            key={slot.id}
            slotId={slot.id}
            item={slot.item}
            isSelected={selectedItem?.slotId === slot.id && selectedItem?.source === 'inventory'}
            onItemClick={onItemClick}
            onSlotClick={onSlotClick}
            onDragStart={onDragStart}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
};
