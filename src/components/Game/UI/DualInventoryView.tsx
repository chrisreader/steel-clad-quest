import React from 'react';
import { Item, WeaponSlots } from '../../../types/GameTypes';
import { ChestInventoryUI } from './ChestInventoryUI';
import { InventorySystem } from '../systems/InventorySystem';

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
  equippedWeapons,
  onEquippedWeaponsChange,
  onEquipWeapon,
  onUnequipWeapon
}) => {
  if (!isOpen) return null;

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
          />
        </div>

        {/* Player Inventory - Right Side, Inline (Not Modal) */}
        <div className="flex-1 max-w-4xl">
          <div className="bg-gray-900 rounded-lg p-6 text-white border-2 border-gray-700 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Player Inventory</h2>
              <button
                onClick={onCloseChest}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex gap-8 h-full overflow-hidden">
              {/* Equipment Panel */}
              <div className="w-64 flex-shrink-0">
                <h3 className="text-lg font-semibold mb-4">Equipment</h3>
                
                {/* Armor Equipment */}
                <div className="space-y-3 mb-6">
                  <div className="text-sm text-gray-300 mb-2">Armor</div>
                  <div className="grid grid-cols-1 gap-2 max-w-16">
                    {['helmet', 'chestplate', 'leggings', 'boots'].map((slot) => (
                      <div key={slot} className="w-12 h-12 border-2 border-gray-600 bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="w-8 h-8 border border-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weapon Equipment */}
                <div className="space-y-3">
                  <div className="text-sm text-gray-300 mb-2">Weapons</div>
                  <div className="space-y-2">
                    {(['primary', 'secondary', 'offhand'] as const).map((slotType) => (
                      <div key={slotType} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16 capitalize">{slotType}</span>
                        <div className="w-12 h-12 border-2 border-gray-600 bg-gray-800 rounded-lg flex items-center justify-center">
                          {equippedWeapons[slotType] ? (
                            <div className="w-6 h-6 text-gray-300 text-xs">⚔</div>
                          ) : (
                            <div className="w-8 h-8 border border-gray-700 rounded"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Main Inventory Grid */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4">Inventory</h3>
                <div className="grid grid-cols-3 gap-2 max-w-48">
                  {Array.from({ length: 9 }, (_, index) => {
                    const item = playerItems[index] || null;
                    return (
                      <div
                        key={index}
                        className={`
                          w-12 h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer
                          transition-all duration-200 relative
                          ${item 
                            ? 'border-gray-500 bg-gray-700 hover:bg-gray-600' 
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                          }
                        `}
                        onClick={() => item && onUseItem(item)}
                      >
                        {item ? (
                          <>
                            <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-xs font-bold">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
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
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};