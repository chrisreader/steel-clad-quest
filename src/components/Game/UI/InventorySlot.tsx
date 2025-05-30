
import React from 'react';
import { Item } from '../../../types/GameTypes';
import { Sword } from 'lucide-react';

interface InventorySlotProps {
  slotId: number;
  item: Item | null;
  onItemClick?: (item: Item, slotId: number) => void;
  onDragStart?: (event: React.DragEvent, item: Item, slotId: number) => void;
  onDrop?: (event: React.DragEvent, slotId: number) => void;
  onDragOver?: (event: React.DragEvent) => void;
}

export const InventorySlot: React.FC<InventorySlotProps> = ({
  slotId,
  item,
  onItemClick,
  onDragStart,
  onDrop,
  onDragOver
}) => {
  const getItemIcon = (item: Item) => {
    switch (item.subtype) {
      case 'sword':
        return <Sword className="w-6 h-6 text-gray-300" />;
      default:
        // For other items, show first letter of name
        return (
          <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-xs font-bold">
            {item.name.charAt(0).toUpperCase()}
          </div>
        );
    }
  };

  const handleClick = () => {
    if (item && onItemClick) {
      onItemClick(item, slotId);
    }
  };

  const handleDragStart = (event: React.DragEvent) => {
    if (item && onDragStart) {
      onDragStart(event, item, slotId);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (onDrop) {
      onDrop(event, slotId);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (onDragOver) {
      onDragOver(event);
    }
  };

  return (
    <div
      className={`
        w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer
        transition-colors duration-200 relative
        ${item 
          ? 'border-gray-500 bg-gray-700 hover:bg-gray-600' 
          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
        }
      `}
      onClick={handleClick}
      draggable={!!item}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      title={item ? `${item.name}\n${item.description}` : `Empty slot ${slotId + 1}`}
    >
      {item ? (
        <>
          {getItemIcon(item)}
          {item.quantity > 1 && (
            <span className="absolute bottom-0 right-0 text-xs text-green-400 bg-gray-900 rounded px-1">
              {item.quantity}
            </span>
          )}
        </>
      ) : (
        <div className="w-8 h-8 border border-gray-700 rounded"></div>
      )}
    </div>
  );
};
