
import React from 'react';

interface StaminaBarProps {
  current: number;
  max: number;
}

export const StaminaBar: React.FC<StaminaBarProps> = ({ current, max }) => {
  const percentage = (current / max) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-2 mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white text-sm font-bold">Stamina</span>
        <span className="text-white text-sm">{Math.floor(current)}/{max}</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-3">
        <div
          className="bg-green-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
