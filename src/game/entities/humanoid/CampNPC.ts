import * as THREE from 'three';
import { PeacefulHumanoid } from './PeacefulHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { CampKeeperBehavior } from '../../ai/CampKeeperBehavior';

export interface CampNPCConfig {
  name: string;
  position: THREE.Vector3;
  campCenter: THREE.Vector3;
  wanderRadius?: number;
  useRandomizedAppearance?: boolean;
  toolType?: 'dagger' | 'sword' | 'staff' | 'axe';
}

export class CampNPC {
  private humanoid: PeacefulHumanoid;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private behavior: CampKeeperBehavior;
  private config: CampNPCConfig;
  private npcId: string;
  
  private walkTime: number = 0;
  private isDead: boolean = false;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private stuckTimer: number = 0;
  private lastMoveTime: number = Date.now();

  constructor(
    scene: THREE.Scene,
    config: CampNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.npcId = `CampNPC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`👤 [${this.npcId}] Creating camp keeper "${config.name}" at:`, config.position);
    
    // Validate managers
    if (!effectsManager || !audioManager) {
      console.error(`❌ [${this.npcId}] Missing managers - Effects: ${!!effectsManager}, Audio: ${!!audioManager}`);
      this.isDead = true;
      return;
    }
    
    try {
      // Create realistic human using the sophisticated PeacefulHumanoid system
      this.humanoid = new PeacefulHumanoid(
        scene,
        config.position,
        effectsManager,
        audioManager,
        false, // Not tavern keeper type
        config.useRandomizedAppearance || true, // Use randomized appearance for variety
        config.toolType || 'dagger' // Default to dagger for camp keeper
      );
      
      this.setupBehavior();
      this.lastPosition.copy(config.position);
      
      console.log(`👤✅ [${this.npcId}] Successfully created camp keeper "${config.name}"`);
    } catch (error) {
      console.error(`❌ [${this.npcId}] Failed to create camp keeper:`, error);
      this.isDead = true;
    }
  }

  private setupBehavior(): void {
    this.behavior = new CampKeeperBehavior({
      wanderRadius: 8, // Consistent radius for all camp NPCs
      moveSpeed: 2.0,
      pauseDuration: 1500,
      interactionRadius: 12
    }, this.config.campCenter);
    
    console.log(`🧠 [${this.npcId}] Setup enhanced camp keeper behavior - wanderRadius: 8, speed: 2.0, pause: 1500ms`);
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    // Check if NPC is stuck (hasn't moved in 5 seconds)
    this.checkIfStuck(deltaTime);

    // Update AI behavior
    const action = this.behavior.update(deltaTime, this.getMesh().position, playerPosition);
    
    // Handle movement based on behavior with enhanced logging
    if (action.type === 'move' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.humanoid.updateWalkAnimation(deltaTime);
      this.lastMoveTime = Date.now();
      console.log(`🚶 [${this.npcId}] Moving towards target:`, action.target);
    } else if (action.type === 'idle') {
      this.humanoid.updateIdleAnimation(deltaTime);
      console.log(`🛌 [${this.npcId}] Standing idle at position:`, this.getMesh().position);
    } else if (action.type === 'interact') {
      this.humanoid.updateIdleAnimation(deltaTime);
      console.log(`💬 [${this.npcId}] Interacting with player`);
    }
  }

  private checkIfStuck(deltaTime: number): void {
    const currentPosition = this.getMesh().position;
    const distanceMoved = currentPosition.distanceTo(this.lastPosition);
    
    if (distanceMoved < 0.1) { // Less than 0.1 units moved
      this.stuckTimer += deltaTime * 1000; // Convert to milliseconds
      
      if (this.stuckTimer > 5000) { // Stuck for 5 seconds
        console.warn(`⚠️ [${this.npcId}] NPC appears stuck! Resetting behavior...`);
        this.resetBehavior();
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
      this.lastPosition.copy(currentPosition);
    }
  }

  private resetBehavior(): void {
    console.log(`🔄 [${this.npcId}] Resetting behavior system`);
    this.setupBehavior();
    this.lastMoveTime = Date.now();
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const mesh = this.getMesh();
    const direction = new THREE.Vector3()
      .subVectors(target, mesh.position)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 2.0 * deltaTime;
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
    console.log(`👤 [CampNPC] Disposed realistic camp keeper ${this.config.name}`);
  }

  public static createCampKeeper(
    scene: THREE.Scene,
    position: THREE.Vector3,
    campCenter: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): CampNPC {
    const tools = ['dagger', 'sword', 'staff', 'axe'];
    const randomTool = tools[Math.floor(Math.random() * tools.length)] as 'dagger' | 'sword' | 'staff' | 'axe';
    
    console.log('👤 [CampNPC] Creating camp keeper at position:', position, 'for camp at:', campCenter);
    
    return new CampNPC(scene, {
      name: 'Camp Keeper',
      position: position,
      campCenter: campCenter,
      wanderRadius: 8, // Consistent with behavior setup
      useRandomizedAppearance: true,
      toolType: randomTool
    }, effectsManager, audioManager);
  }
}