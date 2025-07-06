import * as THREE from 'three';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { HumanBodyConfig } from './HumanBodyConfig';
import { TextureGenerator } from '../../utils';

/**
 * GreenHumanoidEnemy - A smaller, green-skinned human enemy that replaces goblins
 * Uses the sophisticated humanoid system with green skin and no hair
 * Maintains the same combat stats and behavior as the original goblin
 */
export class GreenHumanoidEnemy extends EnemyHumanoid {
  private isPassive: boolean = false; // Start aggressive like original goblins
  private lastPassiveStateChange: number = 0;

  private constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, config, position, effectsManager, audioManager);
    
    // Start aggressive by default (same as original goblins)
    this.isPassive = false;
    
    console.log(`🟢 [GreenHumanoidEnemy] Created with health: ${this.health}, speed: ${config.speed}, starting aggressive`);
  }

  public static create(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1
  ): GreenHumanoidEnemy {
    const config = HumanBodyConfig.createGreenHumanConfig();
    
    // Apply difficulty scaling (same as original goblin)
    config.health = Math.floor(config.health * (1 + difficulty * 0.1));
    config.damage = Math.floor(config.damage * (1 + difficulty * 0.1));
    config.speed = config.speed * (1 + difficulty * 0.05);
    
    return new GreenHumanoidEnemy(scene, config, position, effectsManager, audioManager);
  }

  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const weapon = new THREE.Group();
    
    // Simple dagger for green humanoids
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.25, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5D4037,
      shininess: 40,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.125;
    handle.castShadow = true;
    weapon.add(handle);
    
    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.02, 0.3, 0.1);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x666666,
      shininess: 80,
      specular: 0x888888,
      map: metalTexture
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.4;
    blade.castShadow = true;
    weapon.add(blade);
    
    return weapon;
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    const now = Date.now();
    
    if (this.isDead) {
      // Use base class death handling
      super.update(deltaTime, playerPosition);
      return;
    }

    // Always pursue player when not passive (same as original goblin logic)
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    if (!this.isPassive && distanceToPlayer > this.config.damageRange) {
      // Chase player logic (same as original)
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();
      direction.y = 0;

      // Always face the player when chasing
      this.targetRotation = Math.atan2(direction.x, direction.z);
      this.updateFacingDirection(deltaTime);

      // Move towards player
      const moveAmount = this.config.speed * deltaTime;
      const newPosition = this.mesh.position.clone();
      newPosition.add(direction.multiplyScalar(moveAmount));
      newPosition.y = 0;

      this.mesh.position.copy(newPosition);
      this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
    } else if (!this.isPassive && distanceToPlayer <= this.config.damageRange) {
      // Attack when in range (same as original)
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();
      direction.y = 0;
      this.targetRotation = Math.atan2(direction.x, direction.z);
      this.updateFacingDirection(deltaTime);
      
      if (now - this.lastAttackTime > this.config.attackCooldown) {
        (this as any).attack(playerPosition);
        this.lastAttackTime = now;
      }
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    } else {
      // Idle animation when passive or not in combat
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
  }

  private updateFacingDirection(deltaTime: number): void {
    const currentRotation = this.mesh.rotation.y;
    const rotationDiff = this.targetRotation - currentRotation;
    
    // Normalize rotation difference to [-π, π]
    let normalizedDiff = rotationDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
    while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;
    
    // Apply rotation smoothly
    if (Math.abs(normalizedDiff) > 0.01) {
      const rotationSpeed = this.rotationSpeed * deltaTime;
      const rotationStep = Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationSpeed);
      this.mesh.rotation.y = currentRotation + rotationStep;
    }
  }

  public setPassiveMode(passive: boolean): void {
    if (this.isPassive !== passive) {
      this.isPassive = passive;
      this.lastPassiveStateChange = Date.now();
      
      if (passive) {
        console.log(`🟢 [GreenHumanoidEnemy] Switched to passive mode - will wander peacefully`);
      } else {
        console.log(`🟢 [GreenHumanoidEnemy] Switched to aggressive mode - will attack player`);
      }
    }
  }

  public getIsPassive(): boolean {
    return this.isPassive;
  }

  public getAIBehaviorInfo(): {
    currentState: string | null;
    personality: any;
  } | null {
    return {
      currentState: this.isPassive ? 'passive' : 'aggressive',
      personality: { isPassive: this.isPassive }
    };
  }
}