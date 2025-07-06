import * as THREE from 'three';
import { BaseHumanNPC, BaseNPCConfig } from './BaseHumanNPC';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TavernKeeperBehavior } from '../../ai/TavernKeeperBehavior';

export interface HumanNPCConfig extends BaseNPCConfig {
  wanderRadius?: number;
  toolType?: 'mug' | 'dagger' | 'sword' | 'staff' | 'axe';
}

export class HumanNPC extends BaseHumanNPC {
  private wanderRadius: number;

  constructor(
    scene: THREE.Scene,
    config: HumanNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, config, effectsManager, audioManager, true, 'mug');
    
    this.wanderRadius = config.wanderRadius || 8;
  }

  protected setupBehavior(): void {
    this.behavior = new TavernKeeperBehavior({
      wanderRadius: this.wanderRadius,
      moveSpeed: 1.5,
      pauseDuration: 3000,
      interactionRadius: 15
    });
  }

  protected getMoveSpeed(): number {
    return 1.5;
  }

  public static createTavernKeeper(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): HumanNPC {
    return new HumanNPC(scene, {
      name: 'Tavern Keeper',
      position: position,
      wanderRadius: 8,
      toolType: 'mug'
    }, effectsManager, audioManager);
  }
}