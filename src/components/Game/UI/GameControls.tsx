
import React from 'react';

interface GameControlsProps {
  isPaused: boolean;
  onPause: () => void;
  onRestart: () => void;
  className?: string;
}

export const GameControls: React.FC<GameControlsProps> = React.memo(({
  isPaused,
  onPause,
  onRestart,
  className = ""
}) => {
  return (
    <div className={`flex space-x-4 ${className}`}>
      <button
        onClick={onPause}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      <button
        onClick={onRestart}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Restart
      </button>
    </div>
  );
});

GameControls.displayName = 'GameControls';
