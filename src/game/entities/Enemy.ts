import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { EnemyType, Enemy as EnemyInterface } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { MathUtils } from '../utils';
import { EnemyBodyParts } from './EnemyBody';
import { EnemyAnimationSystem } from '../animation/EnemyAnimationSystem';
import { OrcEnemy } from './humanoid/OrcEnemy';
import { PassiveNPCBehavior, PassiveBehaviorState } from '../ai/PassiveNPCBehavior';
import { EnemyMovementHelper, EnemyMovementConfig } from '../utils/movement/EnemyMovementHelper';
import { TerrainSurfaceDetector } from '../utils/terrain/TerrainSurfaceDetector';
import { PhysicsManager } from '../engine/PhysicsManager';

// Enhanced enemy states for better movement control
enum EnemyMovementState {
  IDLE = 'idle',
  PURSUING = 'pursuing',
  ATTACKING = 'attacking',
  KNOCKED_BACK = 'knocked_back',
  STUNNED = 'stunned'
}

export class Enemy {
  private enemy: EnemyInterface;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  // Enhanced humanoid enemy (for orcs)
  private humanoidEnemy: OrcEnemy | null = null;
  private isHumanoidEnemy: boolean = false;
  
  // Legacy properties for non-humanoid enemies
  private enhancedBodyParts: EnemyBodyParts | null = null;
  private animationSystem: EnemyAnimationSystem | null = null;
  private isEnhancedEnemy: boolean = false;
  
  // Enhanced movement state management
  private movementState: EnemyMovementState = EnemyMovementState.IDLE;
  private knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
  private knockbackDuration: number = 0;
  private knockbackResistance: number = 1.0;
  private stunDuration: number = 0;
  private targetRotation: number = 0;
  private rotationSpeed: number = 3.0;
  private hasInitialOrientation: boolean = false;

  // Enhanced passive behavior with AI for legacy enemies
  private isPassive: boolean = false;
  private lastPassiveStateChange: number = 0;
  private passiveAI: PassiveNPCBehavior | null = null;
  private spawnPosition: THREE.Vector3 = new THREE.Vector3();
  private maxWanderDistance: number = 25;

  // CRITICAL FIX: Terrain-aware movement system
  private movementHelper: EnemyMovementHelper | null = null;
  private movementConfig: EnemyMovementConfig;
  private physicsManager: PhysicsManager | null = null;

  constructor(
    scene: THREE.Scene,
    type: EnemyType,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    physicsManager?: PhysicsManager,
    terrainDetector?: TerrainSurfaceDetector
  ) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.physicsManager = physicsManager || null;
    
    // Initialize movement config based on enemy type
    this.movementConfig = {
      speed: type === EnemyType.ORC ? 3 : 4,
      radius: type === EnemyType.ORC ? 0.9 : 0.6,
      slopeSpeedMultiplier: true,
      maxSlopeAngle: 45
    };

    // PHASE 1: CRITICAL FIX - Ensure terrain movement systems are ALWAYS properly configured
    console.log(`🚶 [Enemy] Constructor - ${type} - PhysicsManager: ${!!physicsManager}, TerrainDetector: ${!!terrainDetector}`);
    
    if (physicsManager && terrainDetector) {
      this.movementHelper = new EnemyMovementHelper(physicsManager, terrainDetector);
      console.log(`✅ [Enemy] ${type} initialized WITH terrain-aware movement`);
    } else {
      this.movementHelper = null;
      console.error(`❌ [Enemy] ${type} initialized WITHOUT terrain-aware movement - THIS WILL CAUSE TERRAIN CLIPPING`);
    }
    
    // Create enemy based on type with humanoid system for orcs
    if (type === EnemyType.ORC) {
      this.humanoidEnemy = OrcEnemy.create(scene, position, effectsManager, audioManager);
      this.isHumanoidEnemy = true;
      
      // CRITICAL: Set movement helper for humanoid enemy if available
      if (this.isHumanoidEnemy && this.humanoidEnemy && this.movementHelper) {
        this.humanoidEnemy.setMovementHelper(this.movementHelper, this.movementConfig);
        console.log(`✅ [Enemy] Movement helper configured for humanoid ${type}`);
      } else {
        console.error(`❌ [Enemy] Failed to configure movement helper for humanoid ${type}`);
      }
      
      // Create interface wrapper for backward compatibility
      this.enemy = this.createEnemyInterface(this.humanoidEnemy);
      
      console.log(`🗡️ [Enemy] Created humanoid orc with terrain-aware movement: ${!!this.movementHelper}`);
    } else {
      this.enemy = this.createEnemy(type, position);
      console.log(`🗡️ [Enemy] Created legacy goblin enemy with terrain-aware movement: ${!!this.movementHelper}`);
      
      // Initialize AI behavior for legacy enemies
      this.passiveAI = new PassiveNPCBehavior(
        position,
        this.maxWanderDistance,
        new THREE.Vector3(0, 0, 0), // Safe zone center
        8 // Safe zone radius
      );
    }
    
    // Set knockback resistance based on enemy type
    this.knockbackResistance = type === EnemyType.ORC ? 0.7 : 1.0;
    
    // Add to scene (only for legacy enemies, humanoid enemies handle their own scene management)
    if (!this.isHumanoidEnemy) {
      scene.add(this.enemy.mesh);
    }

    // Store spawn position for wandering reference
    this.spawnPosition.copy(position);

    // PHASE 3: Ensure enemy starts on terrain surface
    this.validateAndCorrectTerrainPosition();
  }

  // PHASE 3: Add terrain height validation
  private validateAndCorrectTerrainPosition(): void {
    const currentPosition = this.getPosition();
    const correctedPosition = this.ensureTerrainHeight(currentPosition);
    
    if (Math.abs(currentPosition.y - correctedPosition.y) > 0.1) {
      console.log(`🚶 [Enemy] Terrain height correction applied: ${currentPosition.y.toFixed(2)} → ${correctedPosition.y.toFixed(2)}`);
      this.getMesh().position.copy(correctedPosition);
    }
  }
  
  // ... keep existing code (createEnemyInterface, createEnemy methods) the same ...

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      // Delegate to humanoid enemy
      this.humanoidEnemy.update(deltaTime, playerPosition);
      
      // Update interface properties
      this.enemy.isDead = this.humanoidEnemy.getIsDead();
      
      // PHASE 3: Validate humanoid enemy terrain position
      this.validateHumanoidTerrainPosition();
      return;
    }
    
    // Legacy update logic for non-humanoid enemies
    const now = Date.now();
    
    if (this.enemy.isDead) {
      this.updateDeathAnimation(deltaTime);
      return;
    }
    
    if (!this.hasInitialOrientation) {
      this.setInitialOrientation(playerPosition);
      this.hasInitialOrientation = true;
    }
    
    this.updateMovementState(deltaTime);
    
    if (this.enemy.isHit && now - this.enemy.hitTime < 300) {
      // Hit feedback
    } else if (this.enemy.isHit) {
      this.enemy.isHit = false;
    }
    
    // Choose behavior based on passive state
    if (this.isPassive) {
      this.handleAdvancedPassiveMovement(deltaTime);
    } else {
      const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);
      this.handleNormalMovement(deltaTime, playerPosition, distanceToPlayer, now);
    }
    
    this.updateRotation(deltaTime);
    
    // PHASE 3: Final terrain position validation after all movement
    this.validateAndCorrectTerrainPosition();
  }

  // PHASE 3: Validate humanoid enemy terrain position
  private validateHumanoidTerrainPosition(): void {
    if (!this.humanoidEnemy) return;
    
    const position = this.humanoidEnemy.getPosition();
    const terrainHeight = this.getTerrainHeightAtPosition(position);
    const expectedY = terrainHeight + this.movementConfig.radius;
    
    if (Math.abs(position.y - expectedY) > 0.5) {
      console.warn(`⚠️ [Enemy] Humanoid enemy Y position drift detected: current=${position.y.toFixed(2)}, expected=${expectedY.toFixed(2)}`);
    }
  }

  // PHASE 4: Standardized terrain-following movement for passive AI
  private handleAdvancedPassiveMovement(deltaTime: number): void {
    if (!this.passiveAI) return;

    const currentPosition = this.enemy.mesh.position.clone();
    const aiDecision = this.passiveAI.update(deltaTime, currentPosition);

    // Handle different AI behaviors
    if (aiDecision.shouldMove && aiDecision.targetPosition) {
      const direction = new THREE.Vector3()
        .subVectors(aiDecision.targetPosition, currentPosition)
        .normalize();
      direction.y = 0;

      // Calculate movement based on AI speed
      const baseSpeed = this.enemy.speed * 0.4; // Base passive speed
      const aiSpeed = baseSpeed * aiDecision.movementSpeed;
      
      const moveAmount = aiSpeed * deltaTime;
      const targetPosition = currentPosition.clone().add(direction.multiplyScalar(moveAmount));
      
      // PHASE 4: ALWAYS use standardized terrain-following movement
      const finalPosition = this.calculateTerrainAwareMovement(currentPosition, targetPosition);

      // Safety checks
      const distanceFromSpawn = finalPosition.distanceTo(this.spawnPosition);
      
      // Updated to use rectangular safe zone bounds
      const isInSafeZone = finalPosition.x >= -6 && finalPosition.x <= 6 && 
                          finalPosition.z >= -6 && finalPosition.z <= 6;

      if (distanceFromSpawn < this.maxWanderDistance && !isInSafeZone) {
        this.enemy.mesh.position.copy(finalPosition);
        
        // Set rotation to face movement direction
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        // Use legacy animation system
        this.updateLegacyWalkAnimation(deltaTime);
        
        // Debug log for behavior state changes
        const currentState = aiDecision.behaviorState;
        if (Math.random() < 0.01) { // 1% chance to log current behavior
          console.log(`🤖 [Enemy] ${this.enemy.type} behavior: ${currentState}, speed: ${aiSpeed.toFixed(2)}, final_y: ${finalPosition.y.toFixed(2)}`);
        }
      }
    } else {
      // Handle stationary behaviors (resting, etc.)
      const currentState = aiDecision.behaviorState;
      
      if (currentState === PassiveBehaviorState.RESTING) {
        // Occasionally look around while resting
        if (Math.random() < 0.02) {
          const lookDirection = aiDecision.lookDirection;
          this.targetRotation = Math.atan2(lookDirection.x, lookDirection.z);
        }
      }
      
      // Use idle animation when not moving
      this.updateLegacyIdleAnimation();
    }
  }

  public setPassiveMode(passive: boolean): void {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      // Delegate to humanoid enemy
      this.humanoidEnemy.setPassiveMode(passive);
      return;
    }
    
    if (this.isPassive !== passive) {
      this.isPassive = passive;
      this.lastPassiveStateChange = Date.now();
      
      if (passive) {
        console.log(`🛡️ [Enemy] Switching ${this.enemy.type} to passive mode - starting advanced AI behavior`);
        // Regenerate waypoints when entering passive mode
        if (this.passiveAI) {
          this.passiveAI.regenerateWaypoints();
        }
      } else {
        console.log(`⚔️ [Enemy] Switching ${this.enemy.type} to aggressive mode - will pursue player`);
        this.movementState = EnemyMovementState.IDLE;
      }
    }
  }

  public getPassiveMode(): boolean {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getPassiveMode();
    }
    return this.isPassive;
  }

  private setInitialOrientation(playerPosition: THREE.Vector3): void {
    const directionToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, this.enemy.mesh.position)
      .normalize();
    directionToPlayer.y = 0;
    
    this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    this.enemy.mesh.rotation.y = this.targetRotation;
    
    console.log(`🎯 [Enemy] Set initial orientation - Humanoid: ${this.isHumanoidEnemy}, Rotation: ${this.targetRotation.toFixed(2)}`);
  }
  
  private updateMovementState(deltaTime: number): void {
    if (this.knockbackDuration > 0) {
      this.knockbackDuration -= deltaTime * 1000;
      if (this.knockbackDuration <= 0) {
        this.knockbackVelocity.set(0, 0, 0);
        this.movementState = this.stunDuration > 0 ? EnemyMovementState.STUNNED : EnemyMovementState.IDLE;
      }
    }
    
    if (this.stunDuration > 0) {
      this.stunDuration -= deltaTime * 1000;
      if (this.stunDuration <= 0) {
        this.movementState = EnemyMovementState.IDLE;
      }
    }
  }
  
  private handleKnockbackMovement(deltaTime: number): void {
    const movement = this.knockbackVelocity.clone().multiplyScalar(deltaTime);
    const newPosition = this.enemy.mesh.position.clone().add(movement);
    
    // PHASE 2: Apply terrain height instead of Y=0
    const finalPosition = this.ensureTerrainHeight(newPosition);
    this.enemy.mesh.position.copy(finalPosition);
  }
  
  private handleNormalMovement(deltaTime: number, playerPosition: THREE.Vector3, distanceToPlayer: number, now: number): void {
    this.enemy.idleTime += deltaTime;
    
    // Check if we should avoid safe zone when in aggressive mode
    // Updated to use rectangular safe zone bounds
    const isInSafeZone = this.enemy.mesh.position.x >= -6 && this.enemy.mesh.position.x <= 6 && 
                        this.enemy.mesh.position.z >= -6 && this.enemy.mesh.position.z <= 6;
    
    if (isInSafeZone) {
      // Move away from safe zone instead of towards player
      const safeZoneCenter = new THREE.Vector3(0, 0, 0);
      const directionAwayFromSafeZone = new THREE.Vector3()
        .subVectors(this.enemy.mesh.position, safeZoneCenter)
        .normalize();
      directionAwayFromSafeZone.y = 0;
      
      this.targetRotation = Math.atan2(directionAwayFromSafeZone.x, directionAwayFromSafeZone.z);
      
      const moveAmount = this.enemy.speed * deltaTime;
      const targetPosition = this.enemy.mesh.position.clone().add(directionAwayFromSafeZone.multiplyScalar(moveAmount));
      
      // PHASE 4: Use standardized terrain-following movement
      const finalPosition = this.calculateTerrainAwareMovement(this.enemy.mesh.position, targetPosition);
      
      this.enemy.mesh.position.copy(finalPosition);
      this.updateLegacyWalkAnimation(deltaTime);
      return;
    }
    
    if (distanceToPlayer <= this.enemy.attackRange) {
      this.movementState = EnemyMovementState.PURSUING;
      
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.enemy.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
      
      if (distanceToPlayer > this.enemy.damageRange) {
        const moveAmount = this.enemy.speed * deltaTime;
        const targetPosition = this.enemy.mesh.position.clone();
        targetPosition.add(directionToPlayer.multiplyScalar(moveAmount));
        
        // PHASE 4: Use standardized terrain-following movement
        const finalPosition = this.calculateTerrainAwareMovement(this.enemy.mesh.position, targetPosition);
        
        this.enemy.mesh.position.copy(finalPosition);
        this.updateLegacyWalkAnimation(deltaTime);
      }
      
      if (distanceToPlayer <= this.enemy.damageRange && now - this.enemy.lastAttackTime > this.enemy.attackCooldown) {
        this.movementState = EnemyMovementState.ATTACKING;
        this.attack(playerPosition);
        this.enemy.lastAttackTime = now;
      }
    } else {
      if (distanceToPlayer > this.enemy.attackRange && distanceToPlayer < 50) {
        this.movementState = EnemyMovementState.PURSUING;
        
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.enemy.mesh.position)
          .normalize();
        direction.y = 0;
        
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        const slowMoveAmount = this.enemy.speed * deltaTime * 0.3;
        const targetPosition = this.enemy.mesh.position.clone();
        targetPosition.add(direction.multiplyScalar(slowMoveAmount));
        
        // PHASE 4: Use standardized terrain-following movement
        const finalPosition = this.calculateTerrainAwareMovement(this.enemy.mesh.position, targetPosition);
        
        this.enemy.mesh.position.copy(finalPosition);
      } else {
        this.movementState = EnemyMovementState.IDLE;
        this.updateLegacyIdleAnimation();
      }
    }
  }
  
  private updateLegacyWalkAnimation(deltaTime: number): void {
    this.enemy.walkTime += deltaTime * this.enemy.speed * 2.5;
  
    if (this.enemy.leftArm && this.enemy.rightArm && this.enemy.leftLeg && this.enemy.rightLeg) {
      const armSwing = Math.sin(this.enemy.walkTime) * 0.25;
      const legSwing = Math.sin(this.enemy.walkTime + Math.PI) * 0.2;
      
      this.enemy.leftArm.rotation.x = armSwing;
      this.enemy.rightArm.rotation.x = -armSwing;
      this.enemy.leftLeg.rotation.x = legSwing;
      this.enemy.rightLeg.rotation.x = -legSwing;
    }
  }
  
  private updateLegacyIdleAnimation(): void {
    if (this.enemy.body) {
      this.enemy.body.position.y = (this.enemy.type === EnemyType.GOBLIN ? 1.2 : 1.8) / 2 + Math.sin(this.enemy.idleTime * 4) * 0.05;
    }
    
    if (this.enemy.weapon) {
      const baseRotation = -0.5;
      this.enemy.weapon.rotation.z = baseRotation + Math.sin(this.enemy.idleTime * 3) * 0.2;
    }
  }
  
  private updateRotation(deltaTime: number): void {
    if (this.movementState !== EnemyMovementState.KNOCKED_BACK && 
        this.movementState !== EnemyMovementState.STUNNED && 
        this.hasInitialOrientation) {
      
      const currentRotation = this.enemy.mesh.rotation.y;
      const rotationDiff = this.targetRotation - currentRotation;
      
      let normalizedDiff = rotationDiff;
      if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
      
      if (Math.abs(normalizedDiff) > 0.1) {
        const rotationStep = this.rotationSpeed * deltaTime;
        const newRotation = currentRotation + Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationStep);
        this.enemy.mesh.rotation.y = newRotation;
      }
    }
  }
  
  private attack(playerPosition: THREE.Vector3): void {
    this.startLegacyAttackAnimation();
    
    const attackPosition = this.enemy.mesh.position.clone();
    attackPosition.y += 1;
    this.effectsManager.createAttackEffect(attackPosition, 0x880000);
    
    this.audioManager.play('enemy_hurt');
  }
  
  private startLegacyAttackAnimation(): void {
    if (this.enemy.weapon) {
      const originalRotation = this.enemy.weapon.rotation.z;
      
      const swingAnimation = () => {
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = elapsed / duration;
          
          if (progress >= 1) {
            this.enemy.weapon.rotation.z = originalRotation;
            return;
          }
          
          if (progress < 0.3) {
            this.enemy.weapon.rotation.z = originalRotation + progress / 0.3 * 0.5;
          } else if (progress < 0.7) {
            const swingProgress = (progress - 0.3) / 0.4;
            this.enemy.weapon.rotation.z = originalRotation + 0.5 - swingProgress * 1.5;
          } else {
            const returnProgress = (progress - 0.7) / 0.3;
            this.enemy.weapon.rotation.z = originalRotation - 1 + returnProgress;
          }
          
          requestAnimationFrame(animate);
        };
        
        animate();
      };
      
      swingAnimation();
    }
  }
  
  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      // Delegate to humanoid enemy
      this.humanoidEnemy.takeDamage(damage, playerPosition);
      return;
    }
    
    // Legacy damage handling for non-humanoid enemies
    if (this.enemy.isDead) return;
    
    this.enemy.health -= damage;
    this.enemy.isHit = true;
    this.enemy.hitTime = Date.now();
    
    this.effectsManager.createAttackEffect(this.enemy.mesh.position.clone(), 0xFFD700);
    
    const knockbackDirection = new THREE.Vector3()
      .subVectors(this.enemy.mesh.position, playerPosition)
      .normalize();
    knockbackDirection.y = 0;
    
    const baseKnockback = 3.0;
    const damageMultiplier = Math.min(damage / 20, 2.0);
    const knockbackIntensity = (baseKnockback * damageMultiplier) / this.knockbackResistance;
    
    this.knockbackVelocity.copy(knockbackDirection).multiplyScalar(knockbackIntensity);
    this.knockbackDuration = 300;
    this.stunDuration = 150;
    this.movementState = EnemyMovementState.KNOCKED_BACK;
    
    const bloodDirection = knockbackDirection.clone();
    bloodDirection.y = 0.5;
    this.effectsManager.createBloodEffect(this.enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), bloodDirection);
    
    this.audioManager.play('enemy_hurt');
    
    if (this.enemy.health <= 0) {
      this.die();
    }
  }
  
  private die(): void {
    this.enemy.isDead = true;
    this.enemy.deathTime = Date.now();
    this.enemy.deathAnimation.falling = true;
    this.movementState = EnemyMovementState.STUNNED;
    
    // Create ground blood decal on death
    const bloodDirection = new THREE.Vector3(0, -1, 0); // Downward for ground splatter
    this.effectsManager.createRealisticBloodEffect(
      this.enemy.mesh.position.clone(), 
      bloodDirection
    );
    console.log(`🩸 [Enemy] Created death blood decal at position:`, this.enemy.mesh.position);
    
    this.effectsManager.createHitEffect(this.enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    this.audioManager.play('enemy_death');
  }
  
  private updateDeathAnimation(deltaTime: number): void {
    if (!this.enemy.deathAnimation.falling) return;
    
    this.enemy.deathAnimation.fallSpeed += deltaTime * 2;
    
    this.enemy.mesh.rotation.x += this.enemy.deathAnimation.rotationSpeed;
    this.enemy.mesh.position.y -= this.enemy.deathAnimation.fallSpeed;
    
    const fadeProgress = Math.min((Date.now() - this.enemy.deathTime) / 5000, 1);
    this.enemy.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child !== this.enemy.hitBox) {
        (child.material as THREE.MeshLambertMaterial).transparent = true;
        (child.material as THREE.MeshLambertMaterial).opacity = 1 - fadeProgress;
      }
    });
    
    if (this.enemy.mesh.position.y < -2) {
      this.enemy.deathAnimation.falling = false;
    }
  }
  
  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.isInRange(playerPosition, range);
    }
    return this.enemy.mesh.position.distanceTo(playerPosition) <= range;
  }
  
  public isDeadFor(time: number): boolean {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.isDeadFor(time);
    }
    if (!this.enemy.isDead) return false;
    return Date.now() - this.enemy.deathTime > time;
  }
  
  public isDead(): boolean {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getIsDead();
    }
    return this.enemy.isDead;
  }
  
  public getPosition(): THREE.Vector3 {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getPosition();
    }
    return this.enemy.mesh.position.clone();
  }
  
  public getGoldReward(): number {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getGoldReward();
    }
    return this.enemy.goldReward;
  }
  
  public getExperienceReward(): number {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getExperienceReward();
    }
    return this.enemy.experienceReward;
  }
  
  public getMesh(): THREE.Group {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getMesh();
    }
    return this.enemy.mesh;
  }
  
  public getEnemy(): any {
    return this.enemy;
  }
  
  public getDistanceFromPlayer(playerPosition: THREE.Vector3): number {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getDistanceFromPlayer(playerPosition);
    }
    return this.enemy.mesh.position.distanceTo(playerPosition);
  }
  
  public shouldCleanup(maxDistance: number, playerPosition: THREE.Vector3): boolean {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.shouldCleanup(maxDistance, playerPosition);
    }
    if (this.enemy.isDead && this.isDeadFor(30000)) return true;
    if (this.getDistanceFromPlayer(playerPosition) > maxDistance) return true;
    return false;
  }
  
  public static createRandomEnemy(
    scene: THREE.Scene,
    playerPosition: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1,
    physicsManager?: PhysicsManager,
    terrainDetector?: TerrainSurfaceDetector
  ): Enemy {
    const typeRoll = Math.random() * (1 + difficulty * 0.3);
    const type = typeRoll < 0.5 ? EnemyType.GOBLIN : EnemyType.ORC;
    
    const spawnDistance = 20 + Math.random() * 15;
    const angle = Math.random() * Math.PI * 2;
    const spawnPosition = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * spawnDistance,
      0,
      playerPosition.z + Math.sin(angle) * spawnDistance
    );
    
    // CRITICAL FIX: Log terrain system availability during enemy creation
    console.log(`🗡️ [Enemy] Creating ${type} with terrain systems - PhysicsManager: ${!!physicsManager}, TerrainDetector: ${!!terrainDetector}`);
    
    const enemy = new Enemy(scene, type, spawnPosition, effectsManager, audioManager, physicsManager, terrainDetector);
    
    console.log(`🗡️ [Enemy] Created ${type} - Terrain movement available: ${enemy.hasTerrainMovement()}`);
    return enemy;
  }
  
  public dispose(): void {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      this.humanoidEnemy.dispose();
      return;
    }
    
    this.scene.remove(this.enemy.mesh);
    
    this.enemy.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
  
  public isEnhanced(): boolean {
    return this.isHumanoidEnemy || this.isEnhancedEnemy;
  }
  
  public getAnimationSystem(): EnemyAnimationSystem | null {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getAnimationSystem();
    }
    return this.animationSystem;
  }
  
  public getBodyParts(): EnemyBodyParts | null {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getBodyParts();
    }
    return this.enhancedBodyParts;
  }

  // Get AI behavior info for debugging (for legacy enemies)
  public getAIBehaviorInfo(): {
    currentState: PassiveBehaviorState | null;
    personality: any;
  } | null {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.getAIBehaviorInfo();
    }
    
    if (this.passiveAI) {
      return {
        currentState: this.passiveAI.getCurrentState(),
        personality: this.passiveAI.getPersonality()
      };
    }
    
    return null;
  }

  // NEW: Method to check if enemy has terrain movement capability
  public hasTerrainMovement(): boolean {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      return this.humanoidEnemy.hasTerrainMovement();
    }
    return this.movementHelper !== null;
  }

  // NEW: Basic terrain height detection fallback when movement helper is not available
  private getBasicTerrainHeight(position: THREE.Vector3): number {
    // This is a minimal fallback that should rarely be used
    // It attempts to get terrain height directly from physics manager
    const physicsManager = (window as any).gameEngine?.physicsManager;
    if (physicsManager && physicsManager.getTerrainHeightAtPosition) {
      const height = physicsManager.getTerrainHeightAtPosition(position);
      console.log(`🚶 [Enemy] Basic terrain height at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ${height.toFixed(2)}`);
      return height;
    }
    
    // Last resort: return 0 but log the failure
    console.error(`❌ [Enemy] CRITICAL: No terrain height detection available - enemy may clip through terrain`);
    return 0;
  }

  // PHASE 1 & 3: Enhanced terrain height detection with validation
  private ensureTerrainHeight(position: THREE.Vector3): THREE.Vector3 {
    const correctedPosition = position.clone();
    const terrainHeight = this.getTerrainHeightAtPosition(position);
    correctedPosition.y = terrainHeight + this.movementConfig.radius;
    
    console.log(`🚶 [Enemy] Terrain height correction: original_y=${position.y.toFixed(2)}, terrain_height=${terrainHeight.toFixed(2)}, corrected_y=${correctedPosition.y.toFixed(2)}`);
    return correctedPosition;
  }

  // PHASE 1: Robust terrain height detection
  private getTerrainHeightAtPosition(position: THREE.Vector3): number {
    // Try movement helper first (most accurate)
    if (this.movementHelper) {
      const height = this.movementHelper.getTerrainHeightAtPosition(position);
      console.log(`🚶 [Enemy] MovementHelper terrain height: ${height.toFixed(2)}`);
      return height;
    }
    
    // Try physics manager directly
    if (this.physicsManager) {
      const height = this.physicsManager.getTerrainHeightAtPosition(position);
      console.log(`🚶 [Enemy] PhysicsManager terrain height: ${height.toFixed(2)}`);
      return height;
    }
    
    // Try global physics manager
    const globalPhysicsManager = (window as any).gameEngine?.physicsManager;
    if (globalPhysicsManager && globalPhysicsManager.getTerrainHeightAtPosition) {
      const height = globalPhysicsManager.getTerrainHeightAtPosition(position);
      console.log(`🚶 [Enemy] Global PhysicsManager terrain height: ${height.toFixed(2)}`);
      return height;
    }
    
    // Last resort: return 0 but log the failure
    console.error(`❌ [Enemy] CRITICAL: No terrain height detection available - enemy will clip through terrain`);
    return 0;
  }
}
