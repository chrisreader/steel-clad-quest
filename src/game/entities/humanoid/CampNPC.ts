import * as THREE from 'three';
import { BaseHumanNPC, BaseNPCConfig } from './BaseHumanNPC';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { CampKeeperBehavior } from '../../ai/CampKeeperBehavior';

export interface CampNPCConfig extends BaseNPCConfig {
  campCenter: THREE.Vector3;
  toolType?: 'dagger' | 'sword' | 'staff' | 'axe';
}

export class CampNPC extends BaseHumanNPC {
  private campCenter: THREE.Vector3;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private stuckTimer: number = 0;

  constructor(
    scene: THREE.Scene,
    config: CampNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, config, effectsManager, audioManager, false, 'dagger', config.campCenter);
    
    this.campCenter = config.campCenter;
    this.lastPosition.copy(config.position);
  }

  protected setupBehavior(): void {
    this.behavior = new CampKeeperBehavior({
      wanderRadius: 8,
      moveSpeed: 2.0,
      pauseDuration: 1500,
      interactionRadius: 12
    }, this.campCenter);
  }

  protected getMoveSpeed(): number {
    return 2.0;
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    super.update(deltaTime, playerPosition);
    
    if (!this.isDead) {
      this.checkIfStuck(deltaTime);
    }
  }

  private checkIfStuck(deltaTime: number): void {
    const currentPosition = this.getMesh().position;
    const distanceMoved = currentPosition.distanceTo(this.lastPosition);
    
    if (distanceMoved < 0.1) {
      this.stuckTimer += deltaTime * 1000;
      
      if (this.stuckTimer > 3000) {
        // Force movement by creating random target near camp center
        const randomOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          0,
          (Math.random() - 0.5) * 6
        );
        const currentPos = this.getMesh().position;
        const escapeDirection = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        ).normalize();
        
        currentPos.add(escapeDirection.multiplyScalar(0.5));
        this.setupBehavior(); // Reset behavior
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
      this.lastPosition.copy(currentPosition);
    }
  }

  public static createCampKeeper(
    scene: THREE.Scene,
    position: THREE.Vector3,
    campCenter: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): CampNPC {
    const tools = ['dagger', 'sword', 'staff', 'axe'];
    const randomTool = tools[Math.floor(Math.random() * tools.length)] as 'dagger' | 'sword' | 'staff' | 'axe';
    
    return new CampNPC(scene, {
      name: 'Camp Keeper',
      position: position,
      campCenter: campCenter,
      useRandomizedAppearance: true,
      toolType: randomTool
    }, effectsManager, audioManager);
  }
}