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

// Fixed distance-based speed zones for balanced enemy behavior
interface EnemySpeedZones {
  detectionRange: number;
  pursuitRange: number;
  attackRange: number;
  damageRange: number;
  detectionSpeedMultiplier: number;
  pursuitSpeedMultiplier: number;
  attackSpeedMultiplier: number;
  damageSpeedMultiplier: number;
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

  // Terrain-aware movement system with stuck detection
  private movementHelper: EnemyMovementHelper | null = null;
  private movementConfig: EnemyMovementConfig;
  private stuckCounter: number = 0;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private stuckThreshold: number = 0.01;

  // FIXED: Properly balanced distance-based speed scaling system
  private speedZones: EnemySpeedZones;
  private currentSpeedMultiplier: number = 0.3;
  private speedCooldownTimer: number = 0;
  private maxSpeedCooldown: number = 2000; // 2 seconds for faster recovery
  private lastPlayerDistance: number = Infinity;
  private attackExhaustionTimer: number = 0;
  private maxAttackExhaustion: number = 2000; // 2 seconds of exhaustion after attacking

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
    
    // Initialize movement config based on enemy type
    this.movementConfig = {
      speed: type === EnemyType.ORC ? 3 : 4,
      radius: type === EnemyType.ORC ? 0.9 : 0.6,
      slopeSpeedMultiplier: true,
      maxSlopeAngle: 45
    };

    // FIXED: Initialize properly balanced distance-based speed zones
    this.speedZones = type === EnemyType.ORC ? {
      detectionRange: 30,
      pursuitRange: 15,
      attackRange: 4,      // Reduced from 8 to 4
      damageRange: 3,      // Increased from 2.5 to 3
      detectionSpeedMultiplier: 0.3,
      pursuitSpeedMultiplier: 0.6,
      attackSpeedMultiplier: 1.0,  // Reduced from 1.2 to 1.0 (no speed boost)
      damageSpeedMultiplier: 0.4
    } : {
      detectionRange: 25,
      pursuitRange: 12,
      attackRange: 3,      // Reduced from 6 to 3
      damageRange: 2,      // Increased from 1.5 to 2
      detectionSpeedMultiplier: 0.4,
      pursuitSpeedMultiplier: 0.7,
      attackSpeedMultiplier: 1.0,  // Reduced from 1.3 to 1.0
      damageSpeedMultiplier: 0.3
    };

    // Initialize comprehensive terrain-aware movement
    if (physicsManager && terrainDetector) {
      this.movementHelper = new EnemyMovementHelper(physicsManager, terrainDetector);
      console.log(`🚶 Enemy ${type} initialized with fixed speed zones and recovery system`);
    }
    
    // Create enemy based on type with humanoid system for orcs
    if (type === EnemyType.ORC) {
      this.humanoidEnemy = OrcEnemy.create(scene, position, effectsManager, audioManager);
      this.isHumanoidEnemy = true;
      
      // Set movement helper for humanoid enemy
      if (this.movementHelper) {
        this.humanoidEnemy.setMovementHelper(this.movementHelper, this.movementConfig);
      }
      
      // Set speed zones for humanoid enemy
      this.humanoidEnemy.setSpeedZones(this.speedZones);
      
      // Create interface wrapper for backward compatibility
      this.enemy = this.createEnemyInterface(this.humanoidEnemy);
      
      console.log(`🗡️ [Enemy] Created humanoid orc with fixed speed scaling system`);
    } else {
      this.enemy = this.createEnemy(type, position);
      console.log("🗡️ [Enemy] Created legacy goblin enemy with fixed speed scaling system");
      
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

    // Store spawn position and initial position for stuck detection
    this.spawnPosition.copy(position);
    this.lastPosition.copy(position);
  }
  
  private createEnemyInterface(humanoidEnemy: OrcEnemy): EnemyInterface {
    const bodyParts = humanoidEnemy.getBodyParts();
    
    return {
      mesh: humanoidEnemy.getMesh(),
      health: 60,
      maxHealth: 60,
      speed: 3,
      damage: 20,
      goldReward: 50,
      experienceReward: 25,
      lastAttackTime: 0,
      isDead: false,
      deathTime: 0,
      type: EnemyType.ORC,
      leftArm: bodyParts.leftArm,
      rightArm: bodyParts.rightArm,
      leftLeg: bodyParts.leftLeg,
      rightLeg: bodyParts.rightLeg,
      walkTime: 0,
      hitBox: bodyParts.hitBox,
      originalMaterials: [],
      isHit: false,
      hitTime: 0,
      deathAnimation: {
        falling: false,
        rotationSpeed: Math.random() * 0.1 + 0.05,
        fallSpeed: 0
      },
      weapon: bodyParts.weapon,
      body: bodyParts.body,
      head: bodyParts.head,
      attackRange: 8.0,
      damageRange: 2.5,
      attackCooldown: 2000,
      points: 50,
      idleTime: 0
    };
  }
  
  private createEnemy(type: EnemyType, position: THREE.Vector3): EnemyInterface {
    const enemyGroup = new THREE.Group();
    const isGoblin = type === EnemyType.GOBLIN;
    
    let leftArm: THREE.Mesh, rightArm: THREE.Mesh, leftLeg: THREE.Mesh, rightLeg: THREE.Mesh;
    let body: THREE.Mesh, head: THREE.Mesh, weapon: THREE.Group;
    const originalMaterials: THREE.Material[] = [];
    
    // Set enemy stats based on type with increased aggression range
    const stats = isGoblin ? {
      health: 20,
      maxHealth: 20,
      speed: 4,
      damage: 10,
      experienceReward: 10,
      goldReward: 25,
      points: 25,
      attackRange: 6.0,
      damageRange: 1.5,
      attackCooldown: 2000,
      bodyRadius: 0.35,
      bodyHeight: 1.2,
      headRadius: 0.35,
      headY: 1.4,
      armRadius: [0.1, 0.12],
      armHeight: 0.8,
      legRadius: [0.12, 0.15],
      legHeight: 0.8,
      bodyColor: 0x4A7C4A,
      headColor: 0x6B8E6B,
      limbColor: 0x4A7C4A
    } : {
      health: 60,
      maxHealth: 60,
      speed: 3,
      damage: 20,
      experienceReward: 25,
      goldReward: 50,
      points: 50,
      attackRange: 8.0,
      damageRange: 2.0,
      attackCooldown: 2500,
      bodyRadius: 0.5,
      bodyHeight: 1.8,
      headRadius: 0.45,
      headY: 2.1,
      armRadius: [0.15, 0.18],
      armHeight: 1.0,
      legRadius: [0.18, 0.22],
      legHeight: 1.0,
      bodyColor: 0x8B4513,
      headColor: 0x9B5523,
      limbColor: 0x8B4513
    };
    
    // Invisible hitbox
    const hitBoxGeometry = new THREE.BoxGeometry(
      isGoblin ? 1.2 : 1.8,
      isGoblin ? 1.8 : 2.4,
      isGoblin ? 1.2 : 1.8
    );
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = stats.bodyHeight / 2;
    enemyGroup.add(hitBox);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(stats.bodyRadius, stats.bodyRadius * 1.1, stats.bodyHeight, 12);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(stats.bodyColor).multiplyScalar(1.8),
      shininess: 20,
      specular: 0x222222
    });
    body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = stats.bodyHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    enemyGroup.add(body);
    originalMaterials.push(bodyMaterial);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(stats.headRadius, 16, 12);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(stats.headColor).multiplyScalar(1.8),
      shininess: 30
    });
    head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = stats.headY;
    head.castShadow = true;
    head.receiveShadow = true;
    enemyGroup.add(head);
    originalMaterials.push(headMaterial);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFF0000,
      transparent: true,
      opacity: 1,
      emissive: 0xFF0000,
      emissiveIntensity: 0.3
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, stats.headY + 0.05, stats.headRadius * 0.8);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.15, stats.headY + 0.05, stats.headRadius * 0.8);
    enemyGroup.add(leftEye);
    enemyGroup.add(rightEye);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(stats.armRadius[0], stats.armRadius[1], stats.armHeight, 12);
    const armMaterial = new THREE.MeshPhongMaterial({ 
      color: stats.limbColor,
      shininess: 25
    });
    
    leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-(stats.bodyRadius + 0.2), stats.bodyHeight * 0.7, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    enemyGroup.add(leftArm);
    originalMaterials.push(armMaterial);
    
    rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.set(stats.bodyRadius + 0.2, stats.bodyHeight * 0.7, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    enemyGroup.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(stats.legRadius[0], stats.legRadius[1], stats.legHeight, 12);
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: stats.limbColor,
      shininess: 25
    });
    
    leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-stats.bodyRadius * 0.5, stats.legHeight / 2, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    enemyGroup.add(leftLeg);
    originalMaterials.push(legMaterial);
    
    rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(stats.bodyRadius * 0.5, stats.legHeight / 2, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    enemyGroup.add(rightLeg);
    
    // Weapon
    weapon = new THREE.Group();
    
    const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
    
    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.8, 12);
    const shaftMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5D4037,
      shininess: 40,
      map: woodTexture
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.4;
    shaft.castShadow = true;
    weapon.add(shaft);
    
    const metalTexture = TextureGenerator.createMetalTexture(0x444444);
    
    const spikeGeometry = new THREE.ConeGeometry(0.025, 0.12, 8);
    const spikeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      shininess: 80,
      specular: 0x666666,
      map: metalTexture
    });
    
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial.clone());
      const angle = (i / 6) * Math.PI * 2;
      spike.position.set(
        Math.cos(angle) * 0.09,
        0.7,
        Math.sin(angle) * 0.09
      );
      spike.rotation.x = Math.PI / 2;
      spike.rotation.z = angle;
      spike.castShadow = true;
      weapon.add(spike);
    }
    
    weapon.position.set(0.5, stats.bodyHeight * 0.85, 0);
    weapon.rotation.z = -0.5;
    enemyGroup.add(weapon);
    
    if (!isGoblin) {
      const tuskGeometry = new THREE.ConeGeometry(0.05, 0.25, 8);
      const tuskMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xfffacd,
        shininess: 60
      });
      const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
      leftTusk.position.set(-0.15, stats.headY - 0.1, stats.headRadius * 0.8);
      leftTusk.rotation.x = Math.PI;
      leftTusk.castShadow = true;
      const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
      rightTusk.position.set(0.15, stats.headY - 0.1, stats.headRadius * 0.8);
      rightTusk.rotation.x = Math.PI;
      rightTusk.castShadow = true;
      enemyGroup.add(leftTusk);
      enemyGroup.add(rightTusk);
    }
    
    enemyGroup.position.copy(position);
    enemyGroup.position.y = 0;
    enemyGroup.castShadow = true;
    
    return {
      mesh: enemyGroup,
      health: stats.health,
      maxHealth: stats.maxHealth,
      speed: stats.speed,
      damage: stats.damage,
      goldReward: stats.goldReward,
      experienceReward: stats.experienceReward,
      lastAttackTime: 0,
      isDead: false,
      deathTime: 0,
      type: type,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      walkTime: 0,
      hitBox,
      originalMaterials,
      isHit: false,
      hitTime: 0,
      deathAnimation: {
        falling: false,
        rotationSpeed: Math.random() * 0.1 + 0.05,
        fallSpeed: 0
      },
      weapon,
      body,
      head,
      attackRange: stats.attackRange,
      damageRange: stats.damageRange,
      attackCooldown: stats.attackCooldown,
      points: stats.points,
      idleTime: 0
    };
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isHumanoidEnemy && this.humanoidEnemy) {
      // Delegate to humanoid enemy
      this.humanoidEnemy.update(deltaTime, playerPosition);
      
      // Update interface properties
      this.enemy.isDead = this.humanoidEnemy.getIsDead();
      return;
    }
    
    // Legacy update logic for non-humanoid enemies with enhanced surface movement
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
    
    // Update attack exhaustion timer
    if (this.attackExhaustionTimer > 0) {
      this.attackExhaustionTimer -= deltaTime * 1000;
    }
    
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
  }

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
      
      // Apply surface movement calculation
      const targetDirection = direction.clone().multiplyScalar(aiSpeed);
      const finalPosition = this.handleSurfaceMovement(currentPosition, targetDirection, deltaTime);

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
          console.log(`🤖 [Enemy] ${this.enemy.type} behavior: ${currentState}, speed: ${aiSpeed.toFixed(2)}`);
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
    this.enemy.mesh.position.add(movement);
    this.enemy.mesh.position.y = 0;
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
      
      // Use surface movement for safe zone avoidance with base speed
      const targetDirection = directionAwayFromSafeZone.clone().multiplyScalar(this.enemy.speed * 0.8);
      const finalPosition = this.handleSurfaceMovement(this.enemy.mesh.position, targetDirection, deltaTime);
      this.enemy.mesh.position.copy(finalPosition);
      this.updateLegacyWalkAnimation(deltaTime);
      return;
    }
    
    // Calculate distance-based speed multiplier with new fixed system
    const speedMultiplier = this.calculateSpeedMultiplier(distanceToPlayer);
    
    if (distanceToPlayer <= this.speedZones.detectionRange) {
      this.movementState = EnemyMovementState.PURSUING;
      
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.enemy.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
      
      if (distanceToPlayer > this.speedZones.damageRange) {
        // Use surface movement with fixed speed scaling
        const adjustedSpeed = this.enemy.speed * speedMultiplier;
        const targetDirection = directionToPlayer.clone().multiplyScalar(adjustedSpeed);
        const finalPosition = this.handleSurfaceMovement(this.enemy.mesh.position, targetDirection, deltaTime);
        this.enemy.mesh.position.copy(finalPosition);
        this.updateLegacyWalkAnimation(deltaTime);
        
        // Debug speed scaling
        if (Math.random() < 0.01) { // 1% chance to log
          console.log(`🏃 [Enemy] Speed: ${adjustedSpeed.toFixed(1)} (${speedMultiplier.toFixed(2)}x), Distance: ${distanceToPlayer.toFixed(1)}, Exhausted: ${this.attackExhaustionTimer > 0}`);
        }
      }
      
      if (distanceToPlayer <= this.speedZones.damageRange && now - this.enemy.lastAttackTime > this.enemy.attackCooldown) {
        this.movementState = EnemyMovementState.ATTACKING;
        this.attack(playerPosition);
        this.enemy.lastAttackTime = now;
        // FIXED: Set attack exhaustion to force slow speed for 2 seconds
        this.attackExhaustionTimer = this.maxAttackExhaustion;
        this.speedCooldownTimer = this.maxSpeedCooldown;
        this.currentSpeedMultiplier = 0.2; // Force very slow speed immediately
      }
    } else {
      if (distanceToPlayer > this.speedZones.detectionRange && distanceToPlayer < 50) {
        this.movementState = EnemyMovementState.PURSUING;
        
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.enemy.mesh.position)
          .normalize();
        direction.y = 0;
        
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        // Use surface movement for slow distant pursuit
        const adjustedSpeed = this.enemy.speed * 0.2; // Very slow when far
        const targetDirection = direction.clone().multiplyScalar(adjustedSpeed);
        const finalPosition = this.handleSurfaceMovement(this.enemy.mesh.position, targetDirection, deltaTime);
        this.enemy.mesh.position.copy(finalPosition);
      } else {
        this.movementState = EnemyMovementState.IDLE;
        this.updateLegacyIdleAnimation();
        // Reset speed when idle
        this.currentSpeedMultiplier = 0.3;
        this.speedCooldownTimer = 0;
        this.attackExhaustionTimer = 0;
      }
    }
  }
  
  private calculateSpeedMultiplier(distanceToPlayer: number): number {
    const zones = this.speedZones;
    
    // FIXED: Apply attack exhaustion first - if enemy just attacked, force very slow speed
    if (this.attackExhaustionTimer > 0) {
      return 0.2; // Very slow when exhausted from attacking
    }
    
    // Determine current zone and base multiplier
    let targetMultiplier: number;
    
    if (distanceToPlayer > zones.detectionRange) {
      targetMultiplier = 0.1; // Very slow when far away
    } else if (distanceToPlayer > zones.pursuitRange) {
      targetMultiplier = zones.detectionSpeedMultiplier;
    } else if (distanceToPlayer > zones.attackRange) {
      targetMultiplier = zones.pursuitSpeedMultiplier;
    } else if (distanceToPlayer > zones.damageRange) {
      targetMultiplier = zones.attackSpeedMultiplier;
    } else {
      targetMultiplier = zones.damageSpeedMultiplier;
    }
    
    // FIXED: Apply stronger speed decay when moving away from player
    if (distanceToPlayer > this.lastPlayerDistance) {
      this.speedCooldownTimer += 16; // Assume ~60fps (16ms per frame)
      const cooldownProgress = Math.min(this.speedCooldownTimer / this.maxSpeedCooldown, 1);
      // Stronger decay: 80% reduction instead of 50%
      targetMultiplier = Math.max(targetMultiplier * (1 - cooldownProgress * 0.8), 0.1);
    } else {
      // FIXED: Faster recovery when approaching - reset cooldown faster
      this.speedCooldownTimer = Math.max(0, this.speedCooldownTimer - 64); // 4x faster recovery
    }
    
    this.lastPlayerDistance = distanceToPlayer;
    
    // FIXED: Reduced smoothing for faster speed transitions
    const smoothingFactor = 0.15; // Increased from 0.05 for faster transitions
    this.currentSpeedMultiplier += (targetMultiplier - this.currentSpeedMultiplier) * smoothingFactor;
    
    return this.currentSpeedMultiplier;
  }
  
  private handleSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    if (!this.movementHelper) {
      // Fallback to old flat movement if no movement helper
      const targetPosition = currentPosition.clone().add(inputDirection.multiplyScalar(this.movementConfig.speed * deltaTime));
      targetPosition.y = 0;
      return targetPosition;
    }

    // Use comprehensive surface movement calculation
    const newPosition = this.movementHelper.calculateEnemyMovement(
      currentPosition,
      inputDirection,
      this.movementConfig,
      deltaTime
    );

    // Check for stuck movement
    const movementDistance = newPosition.distanceTo(this.lastPosition);
    if (movementDistance < this.stuckThreshold && inputDirection.length() > 0) {
      this.stuckCounter++;
      if (this.stuckCounter > 30) { // Stuck for 30 frames
        console.log(`🚶 Enemy stuck, resetting movement helper`);
        this.movementHelper.resetStuckCounter();
        this.stuckCounter = 0;
      }
    } else {
      this.stuckCounter = 0;
    }

    this.lastPosition.copy(newPosition);
    return newPosition;
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
    
    // FIXED: Reset speed and add exhaustion when taking damage
    this.currentSpeedMultiplier = 0.2;
    this.speedCooldownTimer = this.maxSpeedCooldown * 0.5;
    
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
    
    const enemy = new Enemy(scene, type, spawnPosition, effectsManager, audioManager, physicsManager, terrainDetector);
    console.log(`🗡️ [Enemy] Created ${type} with fixed speed zones and recovery system - Humanoid: ${enemy.isHumanoidEnemy}`);
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
}
