
import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TextureGenerator } from '../../utils';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';

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

  // Passive mode state for safe zone behavior
  private isPassive: boolean = false;
  private passiveWanderTimer: number = 0;
  private passiveWanderDirection: THREE.Vector3 = new THREE.Vector3();
  private spawnPosition: THREE.Vector3 = new THREE.Vector3();
  private maxWanderDistance: number = 25;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, OrcEnemy.ORC_CONFIG, position, effectsManager, audioManager);
    this.spawnPosition.copy(position);
    console.log("🗡️ [OrcEnemy] Created enhanced orc with safe zone awareness");
  }

  public setPassiveMode(passive: boolean): void {
    if (this.isPassive !== passive) {
      this.isPassive = passive;
      
      if (passive) {
        console.log(`🛡️ [OrcEnemy] Switching to passive mode - will wander peacefully`);
        this.generateNewWanderDirection();
        this.passiveWanderTimer = 0;
      } else {
        console.log(`⚔️ [OrcEnemy] Switching to aggressive mode - will pursue player`);
      }
    }
  }

  public getPassiveMode(): boolean {
    return this.isPassive;
  }

  private generateNewWanderDirection(): void {
    // Generate random direction
    const angle = Math.random() * Math.PI * 2;
    this.passiveWanderDirection.set(
      Math.cos(angle),
      0,
      Math.sin(angle)
    );
    
    // 30% chance to stop and idle
    if (Math.random() < 0.3) {
      this.passiveWanderDirection.set(0, 0, 0);
    }
    
    console.log(`🚶 [OrcEnemy] Generated new wander direction:`, this.passiveWanderDirection);
  }

  private handlePassiveMovement(deltaTime: number): void {
    this.passiveWanderTimer += deltaTime * 1000;
    
    // Change direction every 3-5 seconds
    if (this.passiveWanderTimer > 3000 + Math.random() * 2000) {
      this.generateNewWanderDirection();
      this.passiveWanderTimer = 0;
    }
    
    // Move in wander direction
    if (this.passiveWanderDirection.length() > 0) {
      const wanderSpeed = this.config.speed * 0.3; // Much slower than normal movement
      const movement = this.passiveWanderDirection.clone().multiplyScalar(wanderSpeed * deltaTime);
      const newPosition = this.mesh.position.clone().add(movement);
      newPosition.y = 0;
      
      // Check if we're getting too far from spawn point
      const distanceFromSpawn = newPosition.distanceTo(this.spawnPosition);
      if (distanceFromSpawn < this.maxWanderDistance) {
        // Check if new position would be in safe zone - if so, avoid it
        const safeZoneCenter = new THREE.Vector3(0, 0, 0);
        const distanceToSafeZone = newPosition.distanceTo(safeZoneCenter);
        
        if (distanceToSafeZone > 16) { // Stay outside safe zone (15 + 1 buffer)
          this.mesh.position.copy(newPosition);
          // Use animation system for movement animation
          this.animationSystem.updateWalkAnimation(deltaTime, true, wanderSpeed);
        } else {
          // Too close to safe zone, head away from it
          const directionAwayFromSafeZone = new THREE.Vector3()
            .subVectors(newPosition, safeZoneCenter)
            .normalize();
          directionAwayFromSafeZone.y = 0;
          
          this.passiveWanderDirection.copy(directionAwayFromSafeZone);
        }
      } else {
        // Too far from spawn, head back
        const directionToSpawn = new THREE.Vector3()
          .subVectors(this.spawnPosition, this.mesh.position)
          .normalize();
        directionToSpawn.y = 0;
        
        this.passiveWanderDirection.copy(directionToSpawn);
      }
    } else {
      // Idle animation when not moving
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) {
      // Call parent's update to handle death animation properly
      super.update(deltaTime, playerPosition);
      return;
    }

    // Handle passive movement if in passive mode
    if (this.isPassive) {
      this.handlePassiveMovement(deltaTime);
      return;
    }

    // Check if we should avoid safe zone when in aggressive mode
    const safeZoneCenter = new THREE.Vector3(0, 0, 0);
    const distanceToSafeZone = this.mesh.position.distanceTo(safeZoneCenter);
    
    if (distanceToSafeZone < 18) { // Close to safe zone
      // Move away from safe zone instead of towards player
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

  public static create(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): OrcEnemy {
    return new OrcEnemy(scene, position, effectsManager, audioManager);
  }
}
