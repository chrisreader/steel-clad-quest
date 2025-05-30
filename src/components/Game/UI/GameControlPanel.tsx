
import React, { useCallback } from 'react';

interface GameControlPanelProps {
  isPaused: boolean;
  onPauseToggle: () => void;
  onRestart: () => void;
  isGameOver: boolean;
}

const GameControlPanel: React.FC<GameControlPanelProps> = ({
  isPaused,
  onPauseToggle,
  onRestart,
  isGameOver
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      onPauseToggle();
    }
  }, [onPauseToggle]);
  
  // Set up keyboard listeners
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // Render pause menu if game is paused but not over
  if (isPaused && !isGameOver) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
        <div className="text-center text-white bg-gray-900 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-4 text-yellow-400">PAUSED</h1>
          <p className="text-lg mb-6">Press ESC or P to resume</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={onPauseToggle}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Resume
            </button>
            <button
              onClick={onRestart}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Restart
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show only pause button in the top-right corner during gameplay
  if (!isGameOver) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onPauseToggle}
          className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
          aria-label="Pause Game"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isPaused ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </button>
      </div>
    );
  }
  
  // Return null if game is over (GameOverScreen will be displayed instead)
  return null;
};

export default React.memo(GameControlPanel);
