import * as THREE from 'three';
import { PeacefulHumanoid } from './PeacefulHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { CampNPCBehavior } from '../../ai/CampNPCBehavior';

export interface HumanCampNPCConfig {
  name: string;
  position: THREE.Vector3;
  wanderRadius?: number;
  toolType?: 'dagger' | 'sword' | 'staff' | 'axe';
}

/**
 * HumanCampNPC - A sophisticated camp NPC implementation using PeacefulHumanoid
 * Uses the same advanced human anatomy as tavern keeper, with randomized appearance and camp-specific behaviors
 */
export class HumanCampNPC {
  private humanoid: PeacefulHumanoid;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private behavior: CampNPCBehavior;
  private config: HumanCampNPCConfig;
  
  private walkTime: number = 0;
  private isDead: boolean = false;

  constructor(
    scene: THREE.Scene,
    config: HumanCampNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // CRITICAL DEBUG - This should ALWAYS show if an NPC is being created
    console.log(`🚨 [HumanCampNPC] CONSTRUCTOR CALLED for ${config.name} at position:`, config.position);
    console.error(`🚨 [HumanCampNPC] NPC CONSTRUCTOR - ERROR LOG for visibility:`, config.name);
    
    console.log(`🏕️ [HumanCampNPC] Starting creation of ${config.name} with tool: ${config.toolType}`);
    
    // Create sophisticated human using PeacefulHumanoid (same as tavern keeper)
    this.humanoid = new PeacefulHumanoid(
      scene,
      config.position,
      effectsManager,
      audioManager,
      false, // Not tavern keeper type
      true,  // Use randomized appearance for variety
      config.toolType // Tool type for weapon
    );
    
    // CRITICAL: Set the mesh position after creation to ensure it's at the config position
    const mesh = this.humanoid.getMesh();
    mesh.position.copy(config.position);
    console.log(`👤 [HumanCampNPC] Set NPC mesh position to:`, mesh.position);
    
    this.setupBehavior();
    
    console.log(`👤 [HumanCampNPC] Created sophisticated camp human ${config.name} with ${config.toolType || 'no tool'}`);
    console.log(`🎯 [HumanCampNPC] Position:`, config.position);
    console.log(`🎭 [HumanCampNPC] Mesh created:`, !!this.humanoid.getMesh());
    console.error(`🚨 [HumanCampNPC] NPC CREATION COMPLETE:`, config.name);
  }

  private setupBehavior(): void {
    this.behavior = new CampNPCBehavior({
      wanderRadius: this.config.wanderRadius || 6,
      moveSpeed: 1.5,
      pauseDuration: 1000, // Reduced from 2000ms to 1000ms for more active movement
      interactionRadius: 12,
      patrolRadius: this.config.wanderRadius || 6
    }, this.config.position); // Pass camp center position
    
    console.log(`🧠 [HumanCampNPC] Setup camp behavior for ${this.config.name} at position:`, this.config.position);
    console.log(`🧠 [HumanCampNPC] Behavior config:`, {
      wanderRadius: this.config.wanderRadius || 6,
      moveSpeed: 1.5,
      pauseDuration: 1000 // Reduced pause duration
    });
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    // Update AI behavior
    const action = this.behavior.update(deltaTime, this.getMesh().position, playerPosition);
    
    // Handle movement and animation based on behavior - using HumanNPC pattern
    if (action.type === 'move' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.humanoid.updateWalkAnimation(deltaTime);
    } else if (action.type === 'patrol' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.humanoid.updateWalkAnimation(deltaTime);
    } else if (action.type === 'guard' && action.lookDirection) {
      // Guard behavior: rotate to look in direction while idle
      const mesh = this.getMesh();
      const targetRotation = Math.atan2(action.lookDirection.x, action.lookDirection.z);
      mesh.rotation.y = this.smoothRotate(mesh.rotation.y, targetRotation, deltaTime * 2);
      this.humanoid.updateIdleAnimation(deltaTime);
    } else if (action.type === 'idle') {
      this.humanoid.updateIdleAnimation(deltaTime);
    } else if (action.type === 'interact') {
      this.humanoid.updateIdleAnimation(deltaTime);
    }
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const mesh = this.getMesh();
    const direction = new THREE.Vector3()
      .subVectors(target, mesh.position)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 1.5 * deltaTime;
    const newPosition = mesh.position.clone();
    newPosition.add(direction.multiplyScalar(moveSpeed));
    newPosition.y = 0; // Ensure stays on ground
    
    // Check distance to avoid overshooting
    const distanceToTarget = mesh.position.distanceTo(target);
    if (distanceToTarget > 0.5) {
      mesh.position.copy(newPosition);
      
      // Update rotation to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRotation, 0.1);
    }
  }

  private smoothRotate(currentRotation: number, targetRotation: number, speed: number): number {
    let diff = targetRotation - currentRotation;
    
    // Normalize angle difference to [-π, π]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    // Smooth interpolation
    return currentRotation + diff * Math.min(1, speed);
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
    console.log(`👤 [HumanCampNPC] Disposed sophisticated camp human ${this.config.name}`);
  }

  /**
   * Factory method to create a camp NPC with random appearance and tools
   */
  public static createCampNPC(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    npcIndex: number
  ): HumanCampNPC {
    const npcNames = [
      'Camp Guard', 'Hunter', 'Scout', 'Woodsman', 'Traveler'
    ];
    
    // Random tool selection for camp NPCs
    const tools = ['dagger', 'sword', 'staff', 'axe'];
    const randomTool = tools[Math.floor(Math.random() * tools.length)] as 'dagger' | 'sword' | 'staff' | 'axe';
    
    return new HumanCampNPC(scene, {
      name: npcNames[npcIndex % npcNames.length],
      position: position,
      wanderRadius: 5,
      toolType: randomTool
    }, effectsManager, audioManager);
  }
}