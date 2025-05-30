
import React from 'react';

interface GameMenuProps {
  onStartGame: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = React.memo(({ onStartGame }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-700 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4 text-yellow-400">Knight's Quest</h1>
        <p className="text-xl mb-8 text-gray-300">A Medieval Action RPG Adventure</p>
        <button
          onClick={onStartGame}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
        >
          Begin Adventure
        </button>
        <div className="mt-8 text-sm text-gray-400">
          <p>Controls: WASD/Arrow Keys to move, Space to attack</p>
          <p>I = Inventory, K = Skills, Q = Quests, C = Crafting</p>
        </div>
      </div>
    </div>
  );
});

GameMenu.displayName = 'GameMenu';
