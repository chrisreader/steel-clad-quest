
import React from 'react';

interface GameOverScreenProps {
  onRestart: () => void;
  onMainMenu: () => void;
  finalStats: {
    level: number;
    gold: number;
    timeElapsed: number;
    enemiesDefeated: number;
  };
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  onRestart,
  onMainMenu,
  finalStats
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-8 text-white text-center max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold text-red-500 mb-6">Game Over</h2>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between">
            <span>Final Level:</span>
            <span className="font-bold">{finalStats.level}</span>
          </div>
          <div className="flex justify-between">
            <span>Gold Collected:</span>
            <span className="font-bold text-yellow-400">{finalStats.gold}</span>
          </div>
          <div className="flex justify-between">
            <span>Time Survived:</span>
            <span className="font-bold">{formatTime(finalStats.timeElapsed)}</span>
          </div>
          <div className="flex justify-between">
            <span>Enemies Defeated:</span>
            <span className="font-bold text-red-400">{finalStats.enemiesDefeated}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={onMainMenu}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
