
import React from 'react';
import { PlayerStats } from '../../../types/GameTypes';

interface StatusPanelProps {
  playerStats: PlayerStats;
  gameTime: number;
}

export const StatusPanel: React.FC<StatusPanelProps> = React.memo(({ playerStats, gameTime }) => {
  const formatTime = React.useMemo(() => {
    const minutes = Math.floor(gameTime / 60);
    const remainingSeconds = Math.floor(gameTime % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, [gameTime]);

  return (
    <div className="bg-black bg-opacity-50 rounded-lg p-4 text-white">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-300">Level</div>
          <div className="text-lg font-bold">{playerStats.level}</div>
        </div>
        <div>
          <div className="text-sm text-gray-300">Gold</div>
          <div className="text-lg font-bold text-yellow-400">{playerStats.gold}</div>
        </div>
        <div>
          <div className="text-sm text-gray-300">Attack</div>
          <div className="text-lg font-bold text-red-400">{playerStats.attack}</div>
        </div>
        <div>
          <div className="text-sm text-gray-300">Defense</div>
          <div className="text-lg font-bold text-blue-400">{playerStats.defense}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-gray-300">Experience</div>
        <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(playerStats.experience / playerStats.experienceToNext) * 100}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {playerStats.experience}/{playerStats.experienceToNext}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-300">
        Time: {formatTime}
      </div>
    </div>
  );
});

StatusPanel.displayName = 'StatusPanel';
