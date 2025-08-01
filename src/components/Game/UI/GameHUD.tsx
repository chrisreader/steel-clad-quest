
import React from 'react';
import { PlayerStats, Item } from '../../../types/GameTypes';
import { HealthBar } from './HealthBar';
import { StaminaBar } from './StaminaBar';
import { WeaponSlotsHUD } from './WeaponSlotsHUD';
import { ChestInteractionPrompt } from './ChestInteractionPrompt';

interface GameHUDProps {
  playerStats: PlayerStats;
  gameTime: number;
  isInTavern?: boolean;
  primaryWeapon?: Item | null;
  secondaryWeapon?: Item | null;
  offhandWeapon?: Item | null;
  activeWeaponSlot?: 1 | 2 | 3;
  onWeaponSlotSelect?: (slot: 1 | 2 | 3) => void;
  isOffhandDisabled?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({ 
  playerStats, 
  gameTime, 
  isInTavern = false,
  primaryWeapon = null,
  secondaryWeapon = null,
  offhandWeapon = null,
  activeWeaponSlot = 1,
  onWeaponSlotSelect = () => {},
  isOffhandDisabled = false
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black bg-opacity-50 rounded-lg p-4 text-white min-w-64">
          <HealthBar current={playerStats.health} max={playerStats.maxHealth} />
          <StaminaBar current={playerStats.stamina} max={playerStats.maxStamina} />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
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
            Time: {formatTime(gameTime)}
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-300">Location: {isInTavern ? 'Tavern' : 'Forest'}</div>
            {isInTavern ? (
              <div className="text-yellow-400 text-xs mt-1">You're safe in the tavern. Walk outside to face enemies!</div>
            ) : (
              <div className="text-red-400 text-xs mt-1">Click to attack, WASD to move, double-tap W to sprint (needs 50+ stamina, lasts 5 sec)!</div>
            )}
          </div>
        </div>
      </div>

      {/* Weapon Slots HUD */}
      <WeaponSlotsHUD
        primaryWeapon={primaryWeapon}
        secondaryWeapon={secondaryWeapon}
        offhandWeapon={offhandWeapon}
        activeSlot={activeWeaponSlot}
        onSlotSelect={onWeaponSlotSelect}
        isOffhandDisabled={isOffhandDisabled}
      />

      {/* Chest Interaction Prompt */}
      <ChestInteractionPrompt />
    </>
  );
};
