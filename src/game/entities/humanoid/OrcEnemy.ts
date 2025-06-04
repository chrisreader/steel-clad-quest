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

  // CRITICAL FIX: Terrain-aware movement system
  private movementHelper: EnemyMovementHelper | null = null;
  private movementConfig: EnemyMovementConfig = {
    speed: 3,
    radius: 0.9,
    slopeSpeedMultiplier: true,
    maxSlopeAngle: 45
  };

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, OrcEnemy.ORC_CONFIG, position, effectsManager, audioManager);
    this.spawnPosition.copy(position);
    
    // Initialize advanced passive AI
    this.passiveAI = new PassiveNPCBehavior(
      this.spawnPosition,
      this.maxWanderDistance,
      new THREE.Vector3(0, 0, 0), // Safe zone center
      8 // Safe zone radius
    );
    
    console.log("🗡️ [OrcEnemy] Created enhanced orc - terrain movement will be set via setMovementHelper()");
    
    // PHASE 3: Ensure orc starts on terrain surface
    this.validateAndCorrectTerrainPosition();
  }

  // PHASE 1: Enhanced movement helper configuration with validation
  public setMovementHelper(helper: EnemyMovementHelper, config: EnemyMovementConfig): void {
    this.movementHelper = helper;
    this.movementConfig = config;
    console.log("✅ [OrcEnemy] Terrain-aware movement system enabled and configured");
    
    // Validate configuration immediately
    if (!helper) {
      console.error("❌ [OrcEnemy] Invalid movement helper provided");
      return;
    }
    
    // Test terrain height detection
    const currentPos = this.mesh.position.clone();
    const testHeight = helper.getTerrainHeightAtPosition(currentPos);
    console.log(`🚶 [OrcEnemy] Movement helper test - position: (${currentPos.x.toFixed(2)}, ${currentPos.z.toFixed(2)}), terrain height: ${testHeight.toFixed(2)}`);
  }

  // PHASE 3: Add terrain position validation
  private validateAndCorrectTerrainPosition(): void {
    const currentPosition = this.mesh.position.clone();
    const correctedPosition = this.ensureTerrainHeight(currentPosition);
    
    if (Math.abs(currentPosition.y - correctedPosition.y) > 0.1) {
      console.log(`🚶 [OrcEnemy] Terrain height correction applied: ${currentPosition.y.toFixed(2)} → ${correctedPosition.y.toFixed(2)}`);
      this.mesh.position.copy(correctedPosition);
    }
  }

  // PHASE 4: Standardized terrain-following movement for passive AI
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
        this.mesh.position.copy(finalPosition);
        
        // Set rotation to face movement direction
        const targetRotation = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = targetRotation;
        
        // Use animation system with behavior-specific speed
        this.animationSystem.updateWalkAnimation(deltaTime, true, aiSpeed);
        
        // Debug log for behavior state changes
        const currentState = aiDecision.behaviorState;
        if (Math.random() < 0.01) { // 1% chance to log current behavior
          console.log(`🤖 [OrcEnemy] Current behavior: ${currentState}, speed: ${aiSpeed.toFixed(2)}, terrain: ${!!this.movementHelper}, final_y: ${finalPosition.y.toFixed(2)}`);
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
      const targetPosition = this.mesh.position.clone().add(directionAwayFromSafeZone.multiplyScalar(moveAmount));
      
      // PHASE 4: Use standardized terrain-following movement
      const finalPosition = this.calculateTerrainAwareMovement(this.mesh.position, targetPosition);
      
      this.mesh.position.copy(finalPosition);
      this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      return;
    }

    // Normal aggressive behavior with terrain-aware movement
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    if (distanceToPlayer <= this.config.attackRange) {
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      if (distanceToPlayer > this.config.damageRange) {
        const moveAmount = this.config.speed * deltaTime;
        const targetPosition = this.mesh.position.clone().add(directionToPlayer.multiplyScalar(moveAmount));
        
        // PHASE 4: Use standardized terrain-following movement
        const finalPosition = this.calculateTerrainAwareMovement(this.mesh.position, targetPosition);
        
        this.mesh.position.copy(finalPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      }
    }

    // Call parent update for other behaviors (attacking, etc.)
    super.update(deltaTime, playerPosition);
    
    // PHASE 3: Final terrain position validation after all movement
    this.validateAndCorrectTerrainPosition();
  }

  // PHASE 4: Standardized terrain-aware movement calculation
  private calculateTerrainAwareMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3): THREE.Vector3 {
    console.log(`🚶 [OrcEnemy] Calculating terrain-aware movement from (${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}) to (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
    
    if (this.movementHelper) {
      console.log(`✅ [OrcEnemy] Using EnemyMovementHelper for terrain-following`);
      const finalPosition = this.movementHelper.calculateEnemyMovement(
        currentPosition,
        targetPosition,
        this.movementConfig
      );
      console.log(`🚶 [OrcEnemy] Movement helper result: (${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)})`);
      return finalPosition;
    } else {
      console.warn(`⚠️ [OrcEnemy] No movement helper - using enhanced terrain height detection`);
      const finalPosition = this.ensureTerrainHeight(targetPosition);
      console.log(`🚶 [OrcEnemy] Enhanced terrain result: (${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)})`);
      return finalPosition;
    }
  }

  // PHASE 1 & 3: Enhanced terrain height detection with validation
  private ensureTerrainHeight(position: THREE.Vector3): THREE.Vector3 {
    const correctedPosition = position.clone();
    const terrainHeight = this.getTerrainHeightAtPosition(position);
    correctedPosition.y = terrainHeight + this.movementConfig.radius;
    
    console.log(`🚶 [OrcEnemy] Terrain height correction: original_y=${position.y.toFixed(2)}, terrain_height=${terrainHeight.toFixed(2)}, corrected_y=${correctedPosition.y.toFixed(2)}`);
    return correctedPosition;
  }

  // PHASE 1: Robust terrain height detection
  private getTerrainHeightAtPosition(position: THREE.Vector3): number {
    // Try movement helper first (most accurate)
    if (this.movementHelper) {
      const height = this.movementHelper.getTerrainHeightAtPosition(position);
      console.log(`🚶 [OrcEnemy] MovementHelper terrain height: ${height.toFixed(2)}`);
      return height;
    }
    
    // Try global physics manager
    const globalPhysicsManager = (window as any).gameEngine?.physicsManager;
    if (globalPhysicsManager && globalPhysicsManager.getTerrainHeightAtPosition) {
      const height = globalPhysicsManager.getTerrainHeightAtPosition(position);
      console.log(`🚶 [OrcEnemy] Global PhysicsManager terrain height: ${height.toFixed(2)}`);
      return height;
    }
    
    // Last resort: return 0 but log the failure
    console.error(`❌ [OrcEnemy] CRITICAL: No terrain height detection available - orc will clip through terrain`);
    return 0;
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

  public hasTerrainMovement(): boolean {
    return this.movementHelper !== null;
  }

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
}
