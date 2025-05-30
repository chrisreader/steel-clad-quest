
import React from 'react';
import { Item } from '../../../types/GameTypes';

interface InventoryUIProps {
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (item: Item) => void;
}

export const InventoryUI: React.FC<InventoryUIProps> = ({
  items,
  isOpen,
  onClose,
  onUseItem
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-gray-800 rounded-lg p-6 text-white max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 cursor-pointer transition-colors"
              onClick={() => onUseItem(item)}
            >
              <div className="font-bold text-sm">{item.name}</div>
              <div className="text-xs text-gray-400">{item.type}</div>
              <div className="text-xs text-green-400">x{item.quantity}</div>
            </div>
          ))}
        </div>
        
        {items.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Your inventory is empty
          </div>
        )}
      </div>
    </div>
  );
};
