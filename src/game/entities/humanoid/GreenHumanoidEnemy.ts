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
  private isPassive: boolean = true;
  private lastPassiveStateChange: number = 0;

  private constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, config, position, effectsManager, audioManager);
    
    console.log(`🟢 [GreenHumanoidEnemy] Created with health: ${this.health}, speed: ${config.speed}`);
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
      this.updateDeathAnimation(deltaTime);
      return;
    }

    // Simple behavior - move towards player when aggressive, idle when passive
    if (!this.isPassive) {
      const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
      
      if (distanceToPlayer > this.config.damageRange) {
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.mesh.position)
          .normalize();
        direction.y = 0;

        // Set target rotation
        this.targetRotation = Math.atan2(direction.x, direction.z);

        // Move towards player
        const moveAmount = this.config.speed * deltaTime;
        const newPosition = this.mesh.position.clone();
        newPosition.add(direction.multiplyScalar(moveAmount));
        newPosition.y = 0;

        this.mesh.position.copy(newPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, this.mesh.position, playerPosition);
      } else {
        // Attack if in range
        if (now - this.lastAttackTime > this.config.attackCooldown) {
          this.attack(playerPosition);
          this.lastAttackTime = now;
        }
        this.animationSystem.updateWalkAnimation(deltaTime, this.mesh.position, playerPosition);
      }
    } else {
      // Passive - just idle  
      // this.animationSystem.updateIdleAnimation(deltaTime, 0.02);
    }

    this.updateRotation(deltaTime);
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

  private attack(playerPosition: THREE.Vector3): void {
    // Same attack logic as parent class
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    
    this.targetRotation = Math.atan2(direction.x, direction.z);
    
    // Trigger attack animation
    this.animationSystem.startAttackAnimation();
    
    // Play attack sound
    this.audioManager.play('swing');
    
    console.log(`🟢 [GreenHumanoidEnemy] Attacking player for ${this.config.damage} damage`);
  }

  public updateDeathAnimation(deltaTime: number): void {
    if (!this.deathAnimation.falling) {
      this.deathAnimation.falling = true;
      this.deathAnimation.fallSpeed = 0;
    }

    // Apply falling rotation
    this.mesh.rotation.x += this.deathAnimation.rotationSpeed * deltaTime;
    this.mesh.rotation.z += this.deathAnimation.rotationSpeed * 0.5 * deltaTime;

    // Apply falling motion
    this.deathAnimation.fallSpeed += 9.8 * deltaTime; // Gravity
    this.mesh.position.y -= this.deathAnimation.fallSpeed * deltaTime;

    // Stop falling when hitting ground
    if (this.mesh.position.y <= -0.5) {
      this.mesh.position.y = -0.5;
      this.deathAnimation.fallSpeed = 0;
    }
  }

  public updateRotation(deltaTime: number): void {
    const currentRotation = this.mesh.rotation.y;
    const rotationDiff = this.targetRotation - currentRotation;
    
    // Normalize rotation difference to [-π, π]
    const normalizedDiff = ((rotationDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
    
    if (Math.abs(normalizedDiff) > 0.01) {
      const rotationSpeed = this.rotationSpeed * deltaTime;
      const rotationStep = Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationSpeed);
      this.mesh.rotation.y = currentRotation + rotationStep;
    }
  }
}