
import * as THREE from 'three';
import { ANIMATION_CONSTANTS } from './AnimationConstants';

export interface OrcAnimationConfig {
  weaponType: 'axe' | 'sword' | 'club';
  aggressionLevel: number; // 0-1 scale
  bodySize: 'small' | 'medium' | 'large';
}

export class OrcAnimationProfile {
  private config: OrcAnimationConfig;
  private cachedMultipliers: Map<string, number> = new Map();

  constructor(config: OrcAnimationConfig = { 
    weaponType: 'axe', 
    aggressionLevel: 0.8, 
    bodySize: 'medium' 
  }) {
    this.config = config;
    this.preCalculateMultipliers();
  }

  private preCalculateMultipliers(): void {
    const baseMultiplier = ANIMATION_CONSTANTS.WEAPON_MULTIPLIERS[this.config.weaponType.toUpperCase() as keyof typeof ANIMATION_CONSTANTS.WEAPON_MULTIPLIERS];
    const sizeMultiplier = this.getSizeMultiplier();
    const aggressionMultiplier = 0.5 + (this.config.aggressionLevel * 0.5);

    this.cachedMultipliers.set('elbow', baseMultiplier * sizeMultiplier);
    this.cachedMultipliers.set('wrist', baseMultiplier * aggressionMultiplier);
    this.cachedMultipliers.set('knee', sizeMultiplier * aggressionMultiplier);
  }

  private getSizeMultiplier(): number {
    switch (this.config.bodySize) {
      case 'small': return 0.8;
      case 'large': return 1.2;
      default: return 1.0;
    }
  }

  public getElbowMultiplier(): number {
    return this.cachedMultipliers.get('elbow') || 0.6;
  }

  public getWristMultiplier(): number {
    return this.cachedMultipliers.get('wrist') || 0.7;
  }

  public getKneeMultiplier(): number {
    return this.cachedMultipliers.get('knee') || 1.0;
  }

  // Orc-specific attack timing adjustments
  public getAttackTiming(): { windup: number; strike: number; recovery: number } {
    const aggressionSpeedUp = this.config.aggressionLevel * 0.2;
    return {
      windup: ANIMATION_CONSTANTS.COMBAT_PHASES.WINDUP_DURATION * (1 - aggressionSpeedUp),
      strike: ANIMATION_CONSTANTS.COMBAT_PHASES.STRIKE_DURATION * (1 - aggressionSpeedUp * 0.5),
      recovery: ANIMATION_CONSTANTS.COMBAT_PHASES.RECOVERY_DURATION
    };
  }

  // Update configuration and recalculate
  public updateConfig(newConfig: Partial<OrcAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.preCalculateMultipliers();
  }
}
