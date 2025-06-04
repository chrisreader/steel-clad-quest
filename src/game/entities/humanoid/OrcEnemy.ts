import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TextureGenerator } from '../../utils';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';
import { PassiveNPCBehavior, PassiveBehaviorState } from '../../ai/PassiveNPCBehavior';
import { EnemyMovementHelper, EnemyMovementConfig } from '../../utils/movement/EnemyMovementHelper';

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

  // Enhanced passive mode with AI behavior
  private isPassive: boolean = false;
  private passiveAI: PassiveNPCBehavior;
  private spawnPosition: THREE.Vector3 = new THREE.Vector3();
  private maxWanderDistance: number = 25;

  // Terrain-aware movement system with stuck detection
  private movementHelper: EnemyMovementHelper | null = null;
  private movementConfig: EnemyMovementConfig = {
    speed: 3,
    radius: 0.9,
    slopeSpeedMultiplier: true,
    maxSlopeAngle: 45
  };
  private stuckCounter: number = 0;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private stuckThreshold: number = 0.01;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, OrcEnemy.ORC_CONFIG, position, effectsManager, audioManager);
    this.spawnPosition.copy(position);
    this.lastPosition.copy(position);
    
    // Initialize advanced passive AI
    this.passiveAI = new PassiveNPCBehavior(
      this.spawnPosition,
      this.maxWanderDistance,
      new THREE.Vector3(0, 0, 0), // Safe zone center
      8 // Safe zone radius
    );
    
    console.log("🗡️ [OrcEnemy] Created enhanced orc with comprehensive surface movement");
  }

  public setMovementHelper(helper: EnemyMovementHelper, config: EnemyMovementConfig): void {
    this.movementHelper = helper;
    this.movementConfig = config;
    console.log("🚶 [OrcEnemy] Comprehensive surface movement system enabled");
  }

  public setPassiveMode(passive: boolean): void {
    if (this.isPassive !== passive) {
      this.isPassive = passive;
      
      if (passive) {
        console.log(`🛡️ [OrcEnemy] Switching to passive mode - starting advanced AI behavior`);
        // Regenerate waypoints when entering passive mode
        this.passiveAI.regenerateWaypoints();
      } else {
        console.log(`⚔️ [OrcEnemy] Switching to aggressive mode - will pursue player`);
      }
    }
  }

  public getPassiveMode(): boolean {
    return this.isPassive;
  }

  private handleSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    if (!this.movementHelper) {
      // Fallback to old flat movement if no movement helper
      const targetPosition = currentPosition.clone().add(inputDirection.multiplyScalar(this.config.speed * deltaTime));
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
        console.log(`🚶 OrcEnemy stuck, resetting movement helper`);
        this.movementHelper.resetStuckCounter();
        this.stuckCounter = 0;
      }
    } else {
      this.stuckCounter = 0;
    }

    this.lastPosition.copy(newPosition);
    return newPosition;
  }

  private handleAdvancedPassiveMovement(deltaTime: number): void {
    const currentPosition = this.mesh.position.clone();
    const aiDecision = this.passiveAI.update(deltaTime, currentPosition);

    // Handle different AI behaviors
    if (aiDecision.shouldMove && aiDecision.targetPosition) {
      const direction = new THREE.Vector3()
        .subVectors(aiDecision.targetPosition, currentPosition)
        .normalize();
      direction.y = 0;

      // Calculate movement based on AI speed
      const baseSpeed = this.config.speed * 0.4; // Base passive speed
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
        this.mesh.position.copy(finalPosition);
        
        // Set rotation to face movement direction
        const targetRotation = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = targetRotation;
        
        // Use animation system with behavior-specific speed
        this.animationSystem.updateWalkAnimation(deltaTime, true, aiSpeed);
        
        // Debug log for behavior state changes
        const currentState = aiDecision.behaviorState;
        if (Math.random() < 0.01) { // 1% chance to log current behavior
          console.log(`🤖 [OrcEnemy] Current behavior: ${currentState}, speed: ${aiSpeed.toFixed(2)}`);
        }
      }
    } else {
      // Handle stationary behaviors (resting, etc.)
      const currentState = aiDecision.behaviorState;
      
      if (currentState === PassiveBehaviorState.RESTING) {
        // Occasionally look around while resting
        if (Math.random() < 0.02) {
          const lookDirection = aiDecision.lookDirection;
          const targetRotation = Math.atan2(lookDirection.x, lookDirection.z);
          this.mesh.rotation.y = targetRotation;
        }
      }
      
      // Use idle animation when not moving
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) {
      // Call parent's update to handle death animation properly
      super.update(deltaTime, playerPosition);
      return;
    }

    // Handle advanced passive movement if in passive mode
    if (this.isPassive) {
      this.handleAdvancedPassiveMovement(deltaTime);
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
      
      // Use surface movement for safe zone avoidance
      const targetDirection = directionAwayFromSafeZone.clone().multiplyScalar(this.config.speed);
      const finalPosition = this.handleSurfaceMovement(this.mesh.position, targetDirection, deltaTime);
      this.mesh.position.copy(finalPosition);
      
      // Use animation system for movement animation
      this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      return;
    }

    // Normal aggressive behavior with comprehensive surface movement
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    if (distanceToPlayer <= this.config.attackRange) {
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      if (distanceToPlayer > this.config.damageRange) {
        // Use surface movement for pursuing player
        const targetDirection = directionToPlayer.clone().multiplyScalar(this.config.speed);
        const finalPosition = this.handleSurfaceMovement(this.mesh.position, targetDirection, deltaTime);
        this.mesh.position.copy(finalPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      }
    }

    // Call parent update for other behaviors (attacking, etc.)
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
    currentState: PassiveBehaviorState;
    personality: any;
  } {
    return {
      currentState: this.passiveAI.getCurrentState(),
      personality: this.passiveAI.getPersonality()
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
