import * as THREE from 'three';
import { PeacefulHumanoid } from './PeacefulHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';

export interface BaseNPCConfig {
  name: string;
  position: THREE.Vector3;
  useRandomizedAppearance?: boolean;
  toolType?: 'mug' | 'dagger' | 'sword' | 'staff' | 'axe';
}

export interface NPCBehavior {
  update(deltaTime: number, position: THREE.Vector3, playerPosition?: THREE.Vector3): NPCAction;
}

export interface NPCAction {
  type: 'move' | 'idle' | 'interact';
  target?: THREE.Vector3;
  duration?: number;
}

export abstract class BaseHumanNPC {
  protected humanoid: PeacefulHumanoid;
  protected behavior: NPCBehavior;
  protected config: BaseNPCConfig;
  protected isDead: boolean = false;
  private npcId: string;

  constructor(
    scene: THREE.Scene,
    config: BaseNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    isTavernKeeper: boolean = false,
    defaultTool: string = 'dagger'
  ) {
    this.config = config;
    this.npcId = `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Streamlined manager validation
    if (!this.validateManagers(effectsManager, audioManager)) {
      this.isDead = true;
      return;
    }

    try {
      this.humanoid = new PeacefulHumanoid(
        scene,
        config.position,
        effectsManager,
        audioManager,
        isTavernKeeper,
        config.useRandomizedAppearance || true,
        config.toolType || defaultTool
      );
      
      this.setupBehavior();
    } catch (error) {
      console.error(`❌ [${this.npcId}] Creation failed:`, error);
      this.isDead = true;
    }
  }

  private validateManagers(effectsManager: EffectsManager, audioManager: AudioManager): boolean {
    return !!(effectsManager && audioManager && 
      typeof effectsManager.createHitEffect === 'function' && 
      typeof audioManager.playSound === 'function');
  }

  protected abstract setupBehavior(): void;

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    const action = this.behavior.update(deltaTime, this.getMesh().position, playerPosition);
    
    // Handle movement based on behavior
    switch (action.type) {
      case 'move':
        if (action.target) {
          this.moveTowards(action.target, deltaTime);
          this.humanoid.updateAnimation(deltaTime, true, this.getMoveSpeed());
        }
        break;
      case 'idle':
      case 'interact':
        this.humanoid.updateAnimation(deltaTime, false, 0);
        break;
    }
  }

  protected abstract getMoveSpeed(): number;

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const mesh = this.getMesh();
    const direction = new THREE.Vector3()
      .subVectors(target, mesh.position)
      .normalize();
    direction.y = 0;
    
    const moveSpeed = this.getMoveSpeed() * deltaTime;
    const distanceToTarget = mesh.position.distanceTo(target);
    
    if (distanceToTarget > 0.5) {
      const newPosition = mesh.position.clone();
      newPosition.add(direction.multiplyScalar(moveSpeed));
      newPosition.y = 0;
      mesh.position.copy(newPosition);
      
      // Update rotation
      const targetRotation = Math.atan2(direction.x, direction.z);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRotation, 0.1);
    }
  }

  public getMesh(): THREE.Group {
    return this.humanoid.getMesh();
  }

  public getPosition(): THREE.Vector3 {
    return this.humanoid.getPosition();
  }

  public getName(): string {
    return this.config.name;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public dispose(): void {
    this.humanoid.dispose();
  }
}