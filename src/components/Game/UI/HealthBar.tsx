
import React from 'react';

interface HealthBarProps {
  current: number;
  max: number;
}

export const HealthBar: React.FC<HealthBarProps> = ({ current, max }) => {
  const percentage = (current / max) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-2 mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white text-sm font-bold">Health</span>
        <span className="text-white text-sm">{current}/{max}</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-3">
        <div
          className="bg-red-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
