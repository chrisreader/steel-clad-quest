
import React from 'react';
import { Quest } from '../../../types/GameTypes';

interface QuestLogUIProps {
  quests: Quest[];
  isOpen: boolean;
  onClose: () => void;
}

export const QuestLogUI: React.FC<QuestLogUIProps> = ({
  quests,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-gray-800 rounded-lg p-6 text-white max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Quest Log</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {quests.map((quest, index) => (
            <div
              key={index}
              className={`bg-gray-700 rounded-lg p-4 ${
                quest.completed ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-500'
              }`}
            >
              <div className="font-bold text-lg">{quest.title}</div>
              <div className="text-gray-400 mb-2">{quest.description}</div>
              
              <div className="mb-3">
                <h4 className="font-semibold mb-1">Objectives:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {quest.objectives.map((objective, objIndex) => (
                    <li key={objIndex} className="text-gray-300">{objective}</li>
                  ))}
                </ul>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-sm ${quest.completed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {quest.completed ? 'Completed' : 'In Progress'}
                </span>
                <div className="text-sm">
                  Reward: {quest.rewards.gold} gold, {quest.rewards.experience} XP
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {quests.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No quests available
          </div>
        )}
      </div>
    </div>
  );
};
