
import React from 'react';
import { Skill } from '../../../types/GameTypes';

interface SkillTreeUIProps {
  skills: Skill[];
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSkill: (skill: Skill) => void;
  availablePoints: number;
}

export const SkillTreeUI: React.FC<SkillTreeUIProps> = ({
  skills,
  isOpen,
  onClose,
  onUpgradeSkill,
  availablePoints
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-gray-800 rounded-lg p-6 text-white max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Skill Tree</h2>
          <div className="flex items-center gap-4">
            <span>Available Points: {availablePoints}</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {skills.map((skill, index) => (
            <div
              key={index}
              className={`bg-gray-700 rounded-lg p-4 ${
                skill.unlocked ? 'hover:bg-gray-600 cursor-pointer' : 'opacity-50'
              } transition-colors`}
              onClick={() => skill.unlocked && onUpgradeSkill(skill)}
            >
              <div className="font-bold">{skill.name}</div>
              <div className="text-sm text-gray-400 mb-2">{skill.description}</div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Level {skill.level}/{skill.maxLevel}</span>
                <span className="text-yellow-400">Cost: {skill.cost}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
