import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TextureGenerator } from '../../utils';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';
import { PassiveNPCBehavior, PassiveBehaviorState } from '../../ai/PassiveNPCBehavior';

export class OrcEnemy extends EnemyHumanoid {
  private static readonly ORC_CONFIG: HumanoidConfig = {
    type: EnemyType.ORC,
    health: 60,
    maxHealth: 60,
    speed: 3,
    damage: 20,
    goldReward: 50,
    experienceReward: 25,
    attackRange: 3.5,
    damageRange: 2.5,
    attackCooldown: 2000,
    points: 50,
    knockbackResistance: 0.7,
    
    bodyScale: {
      body: { radius: 0.55, height: 1.4 },
      head: { radius: 0.5 },
      arm: { radius: [0.18, 0.22], length: 1.1 },
      forearm: { radius: [0.16, 0.18], length: 0.9 },
      leg: { radius: [0.22, 0.26], length: 0.7 },
      shin: { radius: [0.18, 0.20], length: 0.65 }
    },
    
    colors: {
      skin: 0x4A5D23,
      muscle: 0x5D7A2A,
      accent: 0x3A4D1A
    },
    
    features: {
      hasEyes: true,
      hasTusks: true,
      hasWeapon: true,
      eyeConfig: {
        radius: 0.12,
        color: 0xFF0000,
        emissiveIntensity: 0.4,
        offsetX: 0.2,
        offsetY: 0.05,
        offsetZ: 0.85
      },
      tuskConfig: {
        radius: 0.08,
        height: 0.35,
        color: 0xFFFACD,
        offsetX: 0.2,
        offsetY: -0.15,
        offsetZ: 0.85
      }
    }
  };

  // Enhanced passive mode with simple wandering
  private isPassive: boolean = false;
  private spawnPosition: THREE.Vector3 = new THREE.Vector3();
  private maxWanderDistance: number = 25;
  private wanderTarget: THREE.Vector3 | null = null;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, OrcEnemy.ORC_CONFIG, position, effectsManager, audioManager);
    this.spawnPosition.copy(position);
    
    console.log("🗡️ [OrcEnemy] Created enhanced orc with simple wandering AI");
  }

  public setPassiveMode(passive: boolean): void {
    if (this.isPassive !== passive) {
      this.isPassive = passive;
      
      if (passive) {
        console.log(`🛡️ [OrcEnemy] Switching to passive mode - starting simple wandering`);
        this.wanderTarget = null; // Reset wander target
      } else {
        console.log(`⚔️ [OrcEnemy] Switching to aggressive mode - will pursue player`);
      }
    }
  }

  public getPassiveMode(): boolean {
    return this.isPassive;
  }

  private handleSimpleWandering(deltaTime: number): void {
    // Simple wandering movement when in passive mode
    const currentPosition = this.mesh.position.clone();
    
    // Generate a random direction every few seconds
    if (Math.random() < 0.02) { // 2% chance to change direction
      const angle = Math.random() * Math.PI * 2;
      const distance = 5 + Math.random() * 15; // 5-20 units
      
      this.wanderTarget = new THREE.Vector3(
        this.spawnPosition.x + Math.cos(angle) * distance,
        0,
        this.spawnPosition.z + Math.sin(angle) * distance
      );
    }
    
    if (this.wanderTarget) {
      const direction = new THREE.Vector3()
        .subVectors(this.wanderTarget, currentPosition)
        .normalize();
      direction.y = 0;

      const distanceToTarget = currentPosition.distanceTo(this.wanderTarget);
      
      // Check if we've reached the target or should stop
      if (distanceToTarget < 2.0) {
        this.wanderTarget = null;
        this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
        return;
      }

      // Calculate movement
      const baseSpeed = this.config.speed * 0.3; // Slow wandering speed
      const movement = direction.multiplyScalar(baseSpeed * deltaTime);
      const newPosition = currentPosition.add(movement);
      newPosition.y = 0;

      // Safety checks - ensure we don't wander too far or into safe zone
      const distanceFromSpawn = newPosition.distanceTo(this.spawnPosition);
      const isInSafeZone = newPosition.x >= -6 && newPosition.x <= 6 && 
                          newPosition.z >= -6 && newPosition.z <= 6;

      if (distanceFromSpawn < this.maxWanderDistance && !isInSafeZone) {
        this.mesh.position.copy(newPosition);
        
        // Set rotation to face movement direction
        const targetRotation = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = targetRotation;
        
        // Use animation system
        this.animationSystem.updateWalkAnimation(deltaTime, true, baseSpeed);
      } else {
        // Stop moving if we hit a boundary
        this.wanderTarget = null;
        this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
      }
    } else {
      // Idle behavior - occasionally look around
      if (Math.random() < 0.01) {
        const lookAngle = Math.random() * Math.PI * 2;
        this.mesh.rotation.y = lookAngle;
      }
      
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) {
      // Call parent's update to handle death animation properly
      super.update(deltaTime, playerPosition);
      return;
    }

    // Handle simple wandering if in passive mode
    if (this.isPassive) {
      this.handleSimpleWandering(deltaTime);
      return;
    }

    // Check if we should avoid safe zone when in aggressive mode
    // Updated to use rectangular safe zone bounds
    const isInSafeZone = this.mesh.position.x >= -6 && this.mesh.position.x <= 6 && 
                        this.mesh.position.z >= -6 && this.mesh.position.z <= 6;
    
    if (isInSafeZone) {
      // Move away from safe zone instead of towards player
      const safeZoneCenter = new THREE.Vector3(0, 0, 0);
      const directionAwayFromSafeZone = new THREE.Vector3()
        .subVectors(this.mesh.position, safeZoneCenter)
        .normalize();
      directionAwayFromSafeZone.y = 0;
      
      const moveAmount = this.config.speed * deltaTime;
      const newPosition = this.mesh.position.clone().add(directionAwayFromSafeZone.multiplyScalar(moveAmount));
      newPosition.y = 0;
      
      this.mesh.position.copy(newPosition);
      // Use animation system for movement animation
      this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      return;
    }

    // Normal aggressive behavior
    super.update(deltaTime, playerPosition);
  }

  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const weapon = new THREE.Group();

    // Large battle axe for orcs
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 16);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A2C17,
      shininess: 40,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.9;
    handle.castShadow = true;
    weapon.add(handle);

    // Double-headed axe blade
    const bladeGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.1);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      shininess: 100,
      specular: 0xFFFFFF,
      map: metalTexture
    });

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.position.set(0.25, 1.5, 0);
    blade1.rotation.z = Math.PI / 6;
    blade1.castShadow = true;
    weapon.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial.clone());
    blade2.position.set(-0.25, 1.5, 0);
    blade2.rotation.z = -Math.PI / 6;
    blade2.castShadow = true;
    weapon.add(blade2);

    return weapon;
  }

  // Get AI behavior info for debugging
  public getAIBehaviorInfo(): {
    currentState: string;
    personality: any;
  } {
    return {
      currentState: this.isPassive ? "wandering" : "aggressive",
      personality: { wanderTarget: this.wanderTarget?.clone() }
    };
  }

  public static create(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): OrcEnemy {
    return new OrcEnemy(scene, position, effectsManager, audioManager);
  }
}
