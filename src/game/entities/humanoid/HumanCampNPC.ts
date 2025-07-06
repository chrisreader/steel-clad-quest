import * as THREE from 'three';
import { PureHuman } from './PureHuman';
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
 * HumanCampNPC - A clean camp NPC implementation using PureHuman
 * No orc inheritance, proper human anatomy, and camp-specific behaviors
 */
export class HumanCampNPC {
  private human: PureHuman;
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
    
    // Create clean human using PureHuman (no orc inheritance)
    this.human = new PureHuman(
      scene,
      config.position,
      effectsManager,
      audioManager,
      true, // Use randomized appearance
      config.toolType // Tool type for weapon
    );
    
    this.setupBehavior();
    
    console.log(`👤 [HumanCampNPC] Created clean camp human ${config.name} with ${config.toolType || 'no tool'}`);
  }

  private setupBehavior(): void {
    this.behavior = new CampNPCBehavior({
      wanderRadius: this.config.wanderRadius || 6,
      moveSpeed: 1.5,
      pauseDuration: 2000,
      interactionRadius: 12,
      patrolRadius: this.config.wanderRadius || 6
    });
    
    console.log(`🧠 [HumanCampNPC] Setup camp behavior for ${this.config.name}`);
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    // Update AI behavior
    const action = this.behavior.update(deltaTime, this.getMesh().position, playerPosition);
    
    // Enhanced debug logging for camp NPCs
    if (Math.random() < 0.02) { // Log occasionally
      console.log(`🏕️ [${this.config.name}] Action: ${action.type}, Target:`, action.target, 'Position:', this.getMesh().position);
    }
    
    // Handle movement based on behavior
    if (action.type === 'move' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.human.updateWalkAnimation(deltaTime);
    } else if (action.type === 'patrol' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.human.updateWalkAnimation(deltaTime);
    } else if (action.type === 'idle') {
      this.human.updateIdleAnimation(deltaTime);
    }
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const mesh = this.getMesh();
    const currentPos = mesh.position.clone();
    
    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(target, currentPos)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 1.5 * deltaTime;
    const distanceToTarget = currentPos.distanceTo(target);
    
    // Only move if we're not too close to the target
    if (distanceToTarget > 0.5) {
      const newPosition = currentPos.clone();
      newPosition.add(direction.multiplyScalar(moveSpeed));
      newPosition.y = 0; // Ensure stays on ground
      
      mesh.position.copy(newPosition);
      
      // Update rotation to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRotation, 0.1);
      
      // Debug movement
      if (Math.random() < 0.01) {
        console.log(`🚶 [${this.config.name}] Moving towards target, distance: ${distanceToTarget.toFixed(2)}m`);
      }
    }
  }

  public getMesh(): THREE.Group {
    return this.human.getMesh();
  }

  public getPosition(): THREE.Vector3 {
    return this.human.getPosition();
  }

  public getName(): string {
    return this.config.name;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public dispose(): void {
    this.human.dispose();
    console.log(`👤 [HumanCampNPC] Disposed clean camp human ${this.config.name}`);
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