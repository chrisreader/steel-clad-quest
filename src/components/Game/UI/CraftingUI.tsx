
import React from 'react';
import { Item } from '../../../types/GameTypes';

interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  materials: { item: string; quantity: number }[];
  result: Item;
}

interface CraftingUIProps {
  recipes: CraftingRecipe[];
  inventory: Item[];
  isOpen: boolean;
  onClose: () => void;
  onCraft: (recipe: CraftingRecipe) => void;
}

export const CraftingUI: React.FC<CraftingUIProps> = ({
  recipes,
  inventory,
  isOpen,
  onClose,
  onCraft
}) => {
  if (!isOpen) return null;

  const canCraft = (recipe: CraftingRecipe): boolean => {
    return recipe.materials.every(material => {
      const inventoryItem = inventory.find(item => item.name === material.item);
      return inventoryItem && inventoryItem.quantity >= material.quantity;
    });
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-gray-800 rounded-lg p-6 text-white max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Crafting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {recipes.map((recipe, index) => (
            <div
              key={index}
              className={`bg-gray-700 rounded-lg p-4 ${
                canCraft(recipe) 
                  ? 'hover:bg-gray-600 cursor-pointer border-green-500 border' 
                  : 'opacity-50 border-red-500 border'
              } transition-colors`}
              onClick={() => canCraft(recipe) && onCraft(recipe)}
            >
              <div className="font-bold text-lg">{recipe.name}</div>
              <div className="text-sm text-gray-400 mb-3">{recipe.description}</div>
              
              <div className="mb-3">
                <h4 className="font-semibold mb-2">Materials Required:</h4>
                <div className="space-y-1">
                  {recipe.materials.map((material, matIndex) => {
                    const inventoryItem = inventory.find(item => item.name === material.item);
                    const hasEnough = inventoryItem && inventoryItem.quantity >= material.quantity;
                    
                    return (
                      <div key={matIndex} className={`text-sm ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                        {material.item}: {inventoryItem?.quantity || 0}/{material.quantity}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="text-sm">
                <span className="text-yellow-400">Result: {recipe.result.name}</span>
              </div>
            </div>
          ))}
        </div>
        
        {recipes.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No crafting recipes available
          </div>
        )}
      </div>
    </div>
  );
};
