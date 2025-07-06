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
    
    // Handle movement and animation based on behavior
    if (action.type === 'move' && action.target) {
      const wasMoving = this.moveTowards(action.target, deltaTime);
      this.humanoid.updateAnimation(deltaTime, wasMoving, wasMoving ? 1.5 : 0);
    } else if (action.type === 'patrol' && action.target) {
      const wasMoving = this.moveTowards(action.target, deltaTime);
      this.humanoid.updateAnimation(deltaTime, wasMoving, wasMoving ? 1.2 : 0); // Slower patrol speed
    } else if (action.type === 'guard' && action.lookDirection) {
      // Guard behavior: rotate to look in direction while idle
      const mesh = this.getMesh();
      const targetRotation = Math.atan2(action.lookDirection.x, action.lookDirection.z);
      mesh.rotation.y = this.smoothRotate(mesh.rotation.y, targetRotation, deltaTime * 2);
      this.humanoid.updateAnimation(deltaTime, false, 0); // Idle animation
    } else if (action.type === 'idle') {
      this.humanoid.updateAnimation(deltaTime, false, 0); // Idle animation
    } else if (action.type === 'interact') {
      this.humanoid.updateAnimation(deltaTime, false, 0); // Idle animation during interaction
    }
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): boolean {
    const mesh = this.getMesh();
    const currentPos = mesh.position.clone();
    
    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(target, currentPos)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 3.0 * deltaTime; // Realistic walking speed
    const distanceToTarget = currentPos.distanceTo(target);
    
    // Move if distance > threshold
    if (distanceToTarget > 0.5) {
      // Move towards target
      mesh.position.x += direction.x * moveSpeed;
      mesh.position.z += direction.z * moveSpeed;
      mesh.position.y = 0; // Keep on ground
      
      // Smooth rotation towards movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      mesh.rotation.y = this.smoothRotate(mesh.rotation.y, targetRotation, deltaTime * 4);
      
      return true; // Was moving
    }
    
    return false; // Not moving
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