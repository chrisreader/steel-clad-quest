import React from 'react';
import { Item } from '../../../types/GameTypes';
import { InventorySlot } from './InventorySlot';
import { X } from 'lucide-react';

interface ChestInventoryUIProps {
  isOpen: boolean;
  chestItems: Item[];
  chestType: 'common' | 'rare';
  onClose: () => void;
  onTakeItem: (item: Item, index: number) => void;
  onTakeAll: () => void;
}

export const ChestInventoryUI: React.FC<ChestInventoryUIProps> = ({
  isOpen,
  chestItems,
  chestType,
  onClose,
  onTakeItem,
  onTakeAll
}) => {
  if (!isOpen) return null;

  const maxSlots = 9; // 3x3 grid
  const emptySlots = Math.max(0, maxSlots - chestItems.length);

  const handleSlotClick = (item: Item | null, index: number) => {
    if (item) {
      onTakeItem(item, index);
    }
  };

  const handleDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    // Prevent dropping items into chest - chests are loot-only
  };

  const getChestTitle = () => {
    return chestType === 'rare' ? 'Treasure Chest' : 'Wooden Chest';
  };

  const getChestIcon = () => {
    return chestType === 'rare' ? '[CHEST]' : '[BOX]';
  };

  return (
    <div className="bg-gray-900 rounded-lg border-2 border-gray-700 min-w-80">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`text-lg font-mono ${chestType === 'rare' ? 'text-yellow-400' : 'text-amber-600'}`}>
            {getChestIcon()}
          </div>
          <h3 className="text-lg font-semibold text-white">
            {getChestTitle()}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {chestItems.length > 0 && (
            <button
              onClick={onTakeAll}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Take All
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {chestItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2 font-mono">[EMPTY]</div>
            <p>This chest is empty</p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-sm text-gray-300">
                Contains {chestItems.length} item{chestItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Chest inventory grid */}
            <div className="grid grid-cols-3 gap-2 max-w-48">
              {/* Render actual items */}
              {chestItems.map((item, index) => (
                <InventorySlot
                  key={`chest-item-${index}`}
                  slotId={index}
                  item={item}
                  isSelected={false}
                  onItemClick={handleSlotClick}
                  onSlotClick={() => {}}
                  onDragStart={() => {}} // Disable dragging from chest for now
                  onDrop={handleDrop}
                  isChestSlot={true}
                />
              ))}
              
              {/* Render empty slots */}
              {Array.from({ length: emptySlots }, (_, index) => (
                <InventorySlot
                  key={`chest-empty-${index}`}
                  slotId={chestItems.length + index}
                  item={null}
                  isSelected={false}
                  onItemClick={() => {}}
                  onSlotClick={() => {}}
                  onDragStart={() => {}}
                  onDrop={handleDrop}
                  isChestSlot={true}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};